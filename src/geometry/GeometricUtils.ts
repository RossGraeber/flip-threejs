import type { Vector3 } from 'three';
import { Vector2 } from 'three';

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
  static signedArea2D(p0: Vector2, p1: Vector2, p2: Vector2): number {
    return ((p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y)) / 2;
  }

  /**
   * Computes the 2D cross product (z-component) of two 2D vectors.
   */
  static cross2D(v1: Vector2, v2: Vector2): number {
    return v1.x * v2.y - v1.y * v2.x;
  }

  /**
   * Checks if a quadrilateral formed by four points is convex.
   * Points should be in order around the quadrilateral.
   */
  static isConvexQuad(p0: Vector2, p1: Vector2, p2: Vector2, p3: Vector2): boolean {
    // A quadrilateral is convex if all cross products have the same sign
    const v01 = new Vector2(p1.x - p0.x, p1.y - p0.y);
    const v12 = new Vector2(p2.x - p1.x, p2.y - p1.y);
    const v23 = new Vector2(p3.x - p2.x, p3.y - p2.y);
    const v30 = new Vector2(p0.x - p3.x, p0.y - p3.y);

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
  static circumcenter2D(p0: Vector2, p1: Vector2, p2: Vector2): Vector2 {
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

    return new Vector2(p0.x + cx, p0.y + cy);
  }

  /**
   * Computes the angle between two 2D vectors.
   * Result is in the range [-π, π].
   *
   * @param v1 - First vector
   * @param v2 - Second vector
   * @returns Signed angle from v1 to v2 in radians
   */
  static angleBetweenVectors2D(v1: { x: number; y: number }, v2: { x: number; y: number }): number {
    return Math.atan2(v2.y * v1.x - v2.x * v1.y, v2.x * v1.x + v2.y * v1.y);
  }

  /**
   * Traces a ray across a triangle and finds the exit point.
   * Returns null if the ray doesn't intersect any edge (shouldn't happen for valid inputs).
   *
   * @param entryPoint - Starting point in 2D
   * @param direction - Direction vector (will be normalized)
   * @param triangle - Triangle vertices [p0, p1, p2] in 2D
   * @returns Exit point and which edge it crosses (0: p0-p1, 1: p1-p2, 2: p2-p0), or null
   */
  static traceRayAcrossTriangle(
    entryPoint: { x: number; y: number },
    direction: { x: number; y: number },
    triangle: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }]
  ): { exitPoint: { x: number; y: number }; exitEdge: 0 | 1 | 2 } | null {
    // Normalize direction
    const dirLength = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (dirLength < 1e-10) {
      return null;
    }
    const dir = { x: direction.x / dirLength, y: direction.y / dirLength };

    const [p0, p1, p2] = triangle;

    // Check intersection with each edge
    const edges: Array<[{ x: number; y: number }, { x: number; y: number }, 0 | 1 | 2]> = [
      [p0, p1, 0],
      [p1, p2, 1],
      [p2, p0, 2],
    ];

    let closestIntersection: {
      point: { x: number; y: number };
      edge: 0 | 1 | 2;
      t: number;
    } | null = null;

    for (const [edgeStart, edgeEnd, edgeIndex] of edges) {
      const intersection = this.raySegmentIntersection(entryPoint, dir, edgeStart, edgeEnd);

      if (intersection !== null && intersection.t > 1e-10) {
        // t > epsilon to avoid intersecting the entry edge
        if (closestIntersection === null || intersection.t < closestIntersection.t) {
          closestIntersection = {
            point: intersection.point,
            edge: edgeIndex,
            t: intersection.t,
          };
        }
      }
    }

    if (closestIntersection === null) {
      return null;
    }

    return {
      exitPoint: closestIntersection.point,
      exitEdge: closestIntersection.edge,
    };
  }

  /**
   * Computes the intersection of a ray with a line segment.
   *
   * @param rayOrigin - Origin of the ray
   * @param rayDir - Direction of the ray (should be normalized)
   * @param segStart - Start point of the segment
   * @param segEnd - End point of the segment
   * @returns Intersection point and parameter t along ray, or null if no intersection
   */
  private static raySegmentIntersection(
    rayOrigin: { x: number; y: number },
    rayDir: { x: number; y: number },
    segStart: { x: number; y: number },
    segEnd: { x: number; y: number }
  ): { point: { x: number; y: number }; t: number } | null {
    // Ray: P = rayOrigin + t * rayDir
    // Segment: Q = segStart + s * (segEnd - segStart), s ∈ [0, 1]
    //
    // Solve: rayOrigin + t * rayDir = segStart + s * (segEnd - segStart)

    const segDir = { x: segEnd.x - segStart.x, y: segEnd.y - segStart.y };
    const diff = { x: segStart.x - rayOrigin.x, y: segStart.y - rayOrigin.y };

    // Cross products (inline to avoid type issues)
    const rayDirCrossSegDir = rayDir.x * segDir.y - rayDir.y * segDir.x;

    if (Math.abs(rayDirCrossSegDir) < 1e-10) {
      // Parallel or collinear
      return null;
    }

    const t = (diff.x * segDir.y - diff.y * segDir.x) / rayDirCrossSegDir;
    const s = (diff.x * rayDir.y - diff.y * rayDir.x) / rayDirCrossSegDir;

    // Check if intersection is on the segment (s ∈ [0, 1]) and in ray direction (t ≥ 0)
    if (s >= -1e-10 && s <= 1 + 1e-10 && t >= -1e-10) {
      // Clamp s to [0, 1] to avoid floating point errors
      const clampedS = Math.max(0, Math.min(1, s));
      return {
        point: {
          x: segStart.x + clampedS * segDir.x,
          y: segStart.y + clampedS * segDir.y,
        },
        t,
      };
    }

    return null;
  }
}
