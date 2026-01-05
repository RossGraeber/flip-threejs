import type { Vector3 } from 'three';

/**
 * Utility functions for geometric computations.
 */
export class GeometricUtils {
  /**
   * Computes the interior angle at vertex b in triangle abc using the law of cosines.
   * Given edge lengths a (opposite to vertex A), b, c.
   *
   * @param oppositeSide - Length of the side opposite to the angle
   * @param adjacentSide1 - Length of one adjacent side
   * @param adjacentSide2 - Length of the other adjacent side
   * @returns Angle in radians
   */
  static angleFromSides(
    oppositeSide: number,
    adjacentSide1: number,
    adjacentSide2: number
  ): number {
    // Law of cosines: c² = a² + b² - 2ab*cos(C)
    // Solving for angle C: cos(C) = (a² + b² - c²) / (2ab)
    const numerator =
      adjacentSide1 * adjacentSide1 + adjacentSide2 * adjacentSide2 - oppositeSide * oppositeSide;
    const denominator = 2 * adjacentSide1 * adjacentSide2;

    if (denominator === 0) {
      throw new Error('Degenerate triangle: adjacent sides cannot be zero');
    }

    const cosine = numerator / denominator;
    // Clamp to [-1, 1] to handle floating point errors
    const clampedCosine = Math.max(-1, Math.min(1, cosine));
    return Math.acos(clampedCosine);
  }

  /**
   * Computes all three interior angles of a triangle given its edge lengths.
   *
   * @param edgeA - Length of edge opposite to angle A
   * @param edgeB - Length of edge opposite to angle B
   * @param edgeC - Length of edge opposite to angle C
   * @returns Array of three angles in radians [angleA, angleB, angleC]
   */
  static triangleAngles(edgeA: number, edgeB: number, edgeC: number): [number, number, number] {
    return [
      GeometricUtils.angleFromSides(edgeA, edgeB, edgeC),
      GeometricUtils.angleFromSides(edgeB, edgeC, edgeA),
      GeometricUtils.angleFromSides(edgeC, edgeA, edgeB),
    ];
  }

  /**
   * Computes the area of a triangle given its three edge lengths using Heron's formula.
   *
   * @param a - Length of first edge
   * @param b - Length of second edge
   * @param c - Length of third edge
   * @returns Area of the triangle
   */
  static triangleArea(a: number, b: number, c: number): number {
    const s = (a + b + c) / 2; // Semi-perimeter
    const areaSquared = s * (s - a) * (s - b) * (s - c);

    if (areaSquared < 0) {
      // Triangle inequality violated
      throw new Error('Invalid triangle: edge lengths do not satisfy triangle inequality');
    }

    return Math.sqrt(areaSquared);
  }

  /**
   * Checks if three edge lengths form a valid triangle (triangle inequality).
   */
  static isValidTriangle(a: number, b: number, c: number): boolean {
    return a + b > c && b + c > a && c + a > b && a > 0 && b > 0 && c > 0;
  }

  /**
   * Converts barycentric coordinates to Cartesian 3D coordinates in a triangle.
   *
   * @param u - First barycentric coordinate
   * @param v - Second barycentric coordinate
   * @param w - Third barycentric coordinate (u+v+w=1)
   * @param p0 - First vertex position
   * @param p1 - Second vertex position
   * @param p2 - Third vertex position
   * @returns Cartesian 3D coordinates
   */
  static barycentricToCartesian3D(
    u: number,
    v: number,
    w: number,
    p0: Vector3,
    p1: Vector3,
    p2: Vector3
  ): { x: number; y: number; z: number } {
    return {
      x: u * p0.x + v * p1.x + w * p2.x,
      y: u * p0.y + v * p1.y + w * p2.y,
      z: u * p0.z + v * p1.z + w * p2.z,
    };
  }

  /**
   * Converts Cartesian 3D coordinates to barycentric coordinates in a triangle.
   *
   * @param point - Point in Cartesian coordinates
   * @param p0 - First vertex position
   * @param p1 - Second vertex position
   * @param p2 - Third vertex position
   * @returns Barycentric coordinates [u, v, w] where u+v+w=1
   */
  static cartesianToBarycentric3D(
    point: Vector3,
    p0: Vector3,
    p1: Vector3,
    p2: Vector3
  ): [number, number, number] {
    const v0 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
    const v1 = { x: p2.x - p0.x, y: p2.y - p0.y, z: p2.z - p0.z };
    const v2 = { x: point.x - p0.x, y: point.y - p0.y, z: point.z - p0.z };

    const d00 = v0.x * v0.x + v0.y * v0.y + v0.z * v0.z;
    const d01 = v0.x * v1.x + v0.y * v1.y + v0.z * v1.z;
    const d11 = v1.x * v1.x + v1.y * v1.y + v1.z * v1.z;
    const d20 = v2.x * v0.x + v2.y * v0.y + v2.z * v0.z;
    const d21 = v2.x * v1.x + v2.y * v1.y + v2.z * v1.z;

    const denom = d00 * d11 - d01 * d01;
    if (Math.abs(denom) < 1e-10) {
      throw new Error('Degenerate triangle in barycentric conversion');
    }

    const v = (d11 * d20 - d01 * d21) / denom;
    const w = (d00 * d21 - d01 * d20) / denom;
    const u = 1 - v - w;

    return [u, v, w];
  }

  /**
   * Lays out a triangle in 2D given its three edge lengths.
   * Places the first vertex at origin, second along positive x-axis.
   * Returns plain objects compatible with Three.js Vector2.
   *
   * @param edgeAB - Length of edge from vertex A to B
   * @param edgeBC - Length of edge from vertex B to C
   * @param edgeCA - Length of edge from vertex C to A
   * @returns Array of three 2D vertex positions [A, B, C]
   */
  static layoutTriangle(
    edgeAB: number,
    edgeBC: number,
    edgeCA: number
  ): [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }] {
    if (!GeometricUtils.isValidTriangle(edgeAB, edgeBC, edgeCA)) {
      throw new Error('Cannot layout invalid triangle');
    }

    // Place A at origin
    const A = { x: 0, y: 0 };

    // Place B along positive x-axis
    const B = { x: edgeAB, y: 0 };

    // Compute angle at A using law of cosines
    const angleA = GeometricUtils.angleFromSides(edgeBC, edgeAB, edgeCA);

    // Place C using polar coordinates from A
    const C = { x: edgeCA * Math.cos(angleA), y: edgeCA * Math.sin(angleA) };

    return [A, B, C];
  }

  /**
   * Computes the signed area of a triangle given three 2D points.
   * Positive if vertices are counter-clockwise, negative if clockwise.
   */
  static signedArea2D(
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ): number {
    return ((p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y)) / 2;
  }

  /**
   * Computes the 2D cross product (z-component) of two 2D vectors.
   */
  static cross2D(v1: { x: number; y: number }, v2: { x: number; y: number }): number {
    return v1.x * v2.y - v1.y * v2.x;
  }

  /**
   * Checks if a quadrilateral formed by four points is convex.
   * Points should be in order around the quadrilateral.
   */
  static isConvexQuad(
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number }
  ): boolean {
    // A quadrilateral is convex if all cross products have the same sign
    const v01 = { x: p1.x - p0.x, y: p1.y - p0.y };
    const v12 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v23 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const v30 = { x: p0.x - p3.x, y: p0.y - p3.y };

    const cross1 = GeometricUtils.cross2D(v01, v12);
    const cross2 = GeometricUtils.cross2D(v12, v23);
    const cross3 = GeometricUtils.cross2D(v23, v30);
    const cross4 = GeometricUtils.cross2D(v30, v01);

    return (
      (cross1 >= 0 && cross2 >= 0 && cross3 >= 0 && cross4 >= 0) ||
      (cross1 <= 0 && cross2 <= 0 && cross3 <= 0 && cross4 <= 0)
    );
  }

  /**
   * Computes the circumcenter of a triangle given its three vertices.
   */
  static circumcenter2D(
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ): { x: number; y: number } {
    const ax = p1.x - p0.x;
    const ay = p1.y - p0.y;
    const bx = p2.x - p0.x;
    const by = p2.y - p0.y;

    const denom = 2 * (ax * by - ay * bx);
    if (Math.abs(denom) < 1e-10) {
      throw new Error('Degenerate triangle: cannot compute circumcenter');
    }

    const aSq = ax * ax + ay * ay;
    const bSq = bx * bx + by * by;

    const cx = (by * aSq - ay * bSq) / denom;
    const cy = (ax * bSq - bx * aSq) / denom;

    return { x: p0.x + cx, y: p0.y + cy };
  }
}
