import type { Face } from '../core/Face';
import type { Halfedge } from '../core/Edge';
import { SurfacePoint } from './SurfacePoint';
import { GeometricUtils } from './GeometricUtils';

/**
 * Utilities for tracing geodesic paths across the triangulation.
 * Uses intrinsic geometry (edge lengths) rather than 3D embedding.
 */
export class TraceGeodesic {
  /**
   * Traces a geodesic across a triangle from an entry point in a given direction.
   * Uses the intrinsic metric (edge lengths) to determine the exit point.
   *
   * @param face - The triangle to trace across
   * @param entryPoint - Entry point as a surface point
   * @param direction - Direction angle in radians (in the intrinsic 2D layout)
   * @returns Exit point and the halfedge of the edge we cross
   */
  static traceAcrossTriangle(
    face: Face,
    entryPoint: SurfacePoint,
    direction: number
  ): { exitPoint: SurfacePoint; exitHalfedge: Halfedge } | null {
    if (entryPoint.face.id !== face.id) {
      throw new Error('Entry point must be on the specified face');
    }

    // Get the three edge lengths of this triangle
    const halfedges = face.getHalfedges();

    if (!halfedges || halfedges.length < 3) {
      return null;
    }

    const edges = halfedges.map((he) => he.edge);
    const edgeLengths = edges.map((e) => e.length);

    // Layout the triangle in 2D using intrinsic edge lengths
    // Edge 0: from vertex 0 to vertex 1 (length edgeLengths[0])
    // Edge 1: from vertex 1 to vertex 2 (length edgeLengths[1])
    // Edge 2: from vertex 2 to vertex 0 (length edgeLengths[2])
    const len0 = edgeLengths[0];
    const len1 = edgeLengths[1];
    const len2 = edgeLengths[2];

    if (len0 === undefined || len1 === undefined || len2 === undefined) {
      return null;
    }

    const triangle2D = GeometricUtils.layoutTriangle(len0, len1, len2);

    // Convert entry point to 2D coordinates using barycentric coordinates
    const [u, v, w] = entryPoint.barycentricCoords;
    const entry2D = {
      x: u * triangle2D[0].x + v * triangle2D[1].x + w * triangle2D[2].x,
      y: u * triangle2D[0].y + v * triangle2D[1].y + w * triangle2D[2].y,
    };

    // Direction vector from angle
    const dirVector = {
      x: Math.cos(direction),
      y: Math.sin(direction),
    };

    // Trace ray across the triangle
    const result = GeometricUtils.traceRayAcrossTriangle(entry2D, dirVector, triangle2D);

    if (!result) {
      return null; // Ray doesn't exit (shouldn't happen)
    }

    // Convert exit point back to barycentric coordinates
    const { exitPoint, exitEdge } = result;

    // Compute barycentric coordinates of exit point
    // We know it's on an edge, so one coordinate is ~0
    const baryCoords = this.cartesianToBarycentric2D(exitPoint, triangle2D);

    // Create surface point for exit
    const exitSurfacePoint = new SurfacePoint(face, baryCoords);

    // Get the halfedge we're exiting through
    const exitHalfedge = halfedges[exitEdge];

    if (!exitHalfedge) {
      return null;
    }

    return {
      exitPoint: exitSurfacePoint,
      exitHalfedge,
    };
  }

  /**
   * Converts 2D Cartesian coordinates to barycentric coordinates.
   * Simplified version for 2D triangles.
   *
   * @param point - Point in 2D Cartesian coordinates
   * @param triangle - Triangle vertices in 2D
   * @returns Barycentric coordinates [u, v, w]
   */
  private static cartesianToBarycentric2D(
    point: { x: number; y: number },
    triangle: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }]
  ): [number, number, number] {
    const [p0, p1, p2] = triangle;

    const v0 = { x: p1.x - p0.x, y: p1.y - p0.y };
    const v1 = { x: p2.x - p0.x, y: p2.y - p0.y };
    const v2 = { x: point.x - p0.x, y: point.y - p0.y };

    const d00 = v0.x * v0.x + v0.y * v0.y;
    const d01 = v0.x * v1.x + v0.y * v1.y;
    const d11 = v1.x * v1.x + v1.y * v1.y;
    const d20 = v2.x * v0.x + v2.y * v0.y;
    const d21 = v2.x * v1.x + v2.y * v1.y;

    const denom = d00 * d11 - d01 * d01;

    if (Math.abs(denom) < 1e-10) {
      // Degenerate triangle - return centroid
      return [1 / 3, 1 / 3, 1 / 3];
    }

    const v = (d11 * d20 - d01 * d21) / denom;
    const w = (d00 * d21 - d01 * d20) / denom;
    const u = 1 - v - w;

    // Clamp to [0, 1] and renormalize to handle numerical errors
    const clampedU = Math.max(0, Math.min(1, u));
    const clampedV = Math.max(0, Math.min(1, v));
    const clampedW = Math.max(0, Math.min(1, w));

    const sum = clampedU + clampedV + clampedW;

    if (sum < 1e-10) {
      return [1 / 3, 1 / 3, 1 / 3];
    }

    return [clampedU / sum, clampedV / sum, clampedW / sum];
  }

  /**
   * Traces a geodesic path along a sequence of edges, generating a polyline.
   * This will sample points at regular intervals along the path.
   *
   * @param startPoint - Starting surface point
   * @param endPoint - Ending surface point
   * @param edges - Sequence of edges to follow
   * @param stepSize - Step size for sampling (in intrinsic units)
   * @returns Array of surface points along the path
   */
  static traceAlongPath(
    startPoint: SurfacePoint,
    endPoint: SurfacePoint,
    _edges: Halfedge[],
    _stepSize: number
  ): SurfacePoint[] {
    // TODO: Implement path tracing with sampling
    // This requires more complex logic to:
    // 1. Determine the geodesic direction at each point
    // 2. Trace across faces, following the edge sequence
    // 3. Sample at regular intervals
    //
    // For now, return just the start and end points
    return [startPoint, endPoint];
  }

  /**
   * Computes the straight-line distance between two points in a triangle.
   * Uses the intrinsic metric.
   *
   * @param face - The triangle
   * @param point1 - First point (barycentric)
   * @param point2 - Second point (barycentric)
   * @returns Distance in intrinsic units
   */
  static distanceInTriangle(
    face: Face,
    point1: [number, number, number],
    point2: [number, number, number]
  ): number {
    // Layout triangle in 2D
    const halfedges = face.getHalfedges();

    if (!halfedges || halfedges.length < 3) {
      return 0;
    }

    const edges = halfedges.map((he) => he.edge);
    const edgeLengths = edges.map((e) => e.length);

    const len0 = edgeLengths[0];
    const len1 = edgeLengths[1];
    const len2 = edgeLengths[2];

    if (len0 === undefined || len1 === undefined || len2 === undefined) {
      return 0;
    }

    const triangle2D = GeometricUtils.layoutTriangle(len0, len1, len2);

    // Convert both points to 2D
    const [u1, v1, w1] = point1;
    const p1_2D = {
      x: u1 * triangle2D[0].x + v1 * triangle2D[1].x + w1 * triangle2D[2].x,
      y: u1 * triangle2D[0].y + v1 * triangle2D[1].y + w1 * triangle2D[2].y,
    };

    const [u2, v2, w2] = point2;
    const p2_2D = {
      x: u2 * triangle2D[0].x + v2 * triangle2D[1].x + w2 * triangle2D[2].x,
      y: u2 * triangle2D[0].y + v2 * triangle2D[1].y + w2 * triangle2D[2].y,
    };

    // Euclidean distance in 2D
    const dx = p2_2D.x - p1_2D.x;
    const dy = p2_2D.y - p1_2D.y;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Computes the direction angle from one point to another within a triangle.
   * Returns angle in radians in the intrinsic 2D layout.
   *
   * @param face - The triangle
   * @param fromPoint - Starting point (barycentric)
   * @param toPoint - Ending point (barycentric)
   * @returns Direction angle in radians
   */
  static directionInTriangle(
    face: Face,
    fromPoint: [number, number, number],
    toPoint: [number, number, number]
  ): number {
    // Layout triangle in 2D
    const halfedges = face.getHalfedges();

    if (!halfedges || halfedges.length < 3) {
      return 0;
    }

    const edges = halfedges.map((he) => he.edge);
    const edgeLengths = edges.map((e) => e.length);

    const len0 = edgeLengths[0];
    const len1 = edgeLengths[1];
    const len2 = edgeLengths[2];

    if (len0 === undefined || len1 === undefined || len2 === undefined) {
      return 0;
    }

    const triangle2D = GeometricUtils.layoutTriangle(len0, len1, len2);

    // Convert both points to 2D
    const [u1, v1, w1] = fromPoint;
    const p1_2D = {
      x: u1 * triangle2D[0].x + v1 * triangle2D[1].x + w1 * triangle2D[2].x,
      y: u1 * triangle2D[0].y + v1 * triangle2D[1].y + w1 * triangle2D[2].y,
    };

    const [u2, v2, w2] = toPoint;
    const p2_2D = {
      x: u2 * triangle2D[0].x + v2 * triangle2D[1].x + w2 * triangle2D[2].x,
      y: u2 * triangle2D[0].y + v2 * triangle2D[1].y + w2 * triangle2D[2].y,
    };

    // Direction vector
    const dx = p2_2D.x - p1_2D.x;
    const dy = p2_2D.y - p1_2D.y;

    return Math.atan2(dy, dx);
  }
}
