import type { FlipEdgeNetwork } from './FlipEdgeNetwork';
import type { GeodesicPath } from './GeodesicPath';
import type { Vertex } from '../core/Vertex';
import type { VertexId } from '../types';
import { SurfacePoint } from '../geometry/SurfacePoint';

/**
 * Utilities for subdividing geodesic Bezier curves.
 *
 * A geodesic Bezier curve is defined by control points on the mesh surface.
 * The curve is represented as a piecewise geodesic path connecting these points.
 * Subdivision refines the curve by inserting additional control points at midpoints.
 *
 * This is based on the Bezier subdivision scheme from the FlipOut paper (Section 6).
 */
export class BezierSubdivision {
  /**
   * Performs one round of Bezier subdivision on a flip edge network.
   *
   * For each segment between marked vertices (control points):
   * 1. Find the midpoint along the geodesic
   * 2. Insert a new vertex at the midpoint (if not already on a vertex)
   * 3. Mark the new vertex as a control point
   * 4. Split the path at the midpoint
   * 5. Re-straighten both resulting segments
   *
   * @param network - The flip edge network with marked control points
   * @returns Number of subdivisions performed
   */
  static subdivideOnce(network: FlipEdgeNetwork): number {
    const segments = this.getMarkedSegments(network);

    if (segments.length === 0) {
      // No marked segments, subdivide all paths
      return this.subdivideAllPaths(network);
    }

    let subdivisionCount = 0;

    for (const segment of segments) {
      const subdivided = this.subdivideSegment(network, segment);
      if (subdivided) {
        subdivisionCount++;
      }
    }

    return subdivisionCount;
  }

  /**
   * Performs multiple rounds of Bezier subdivision.
   *
   * @param network - The flip edge network
   * @param rounds - Number of subdivision rounds
   * @returns Total number of subdivisions performed
   */
  static subdivide(network: FlipEdgeNetwork, rounds: number): number {
    let totalSubdivisions = 0;

    for (let i = 0; i < rounds; i++) {
      const count = this.subdivideOnce(network);
      totalSubdivisions += count;

      if (count === 0) {
        break; // No more subdivisions possible
      }

      // Re-straighten all paths after subdivision
      network.iterativeShorten();
    }

    return totalSubdivisions;
  }

  /**
   * Gets segments between marked vertices.
   * Each segment is a sub-path that starts and ends at marked vertices.
   *
   * @param network - The flip edge network
   * @returns Array of segments with start/end marked vertices
   */
  private static getMarkedSegments(
    network: FlipEdgeNetwork
  ): Array<{ path: GeodesicPath; startVertex: Vertex; endVertex: Vertex }> {
    const segments: Array<{ path: GeodesicPath; startVertex: Vertex; endVertex: Vertex }> = [];

    for (const path of network.paths) {
      const vertices = path.getVertices();

      // Find marked vertices in this path
      const markedIndices: number[] = [];
      for (let i = 0; i < vertices.length; i++) {
        const v = vertices[i];
        if (v && network.markedVertices.has(v.id)) {
          markedIndices.push(i);
        }
      }

      // If no marked vertices, treat entire path as one segment
      if (markedIndices.length === 0) {
        segments.push({
          path,
          startVertex: path.startVertex,
          endVertex: path.endVertex,
        });
        continue;
      }

      // Create segments between consecutive marked vertices
      for (let i = 0; i < markedIndices.length - 1; i++) {
        const startIdx = markedIndices[i];
        const endIdx = markedIndices[i + 1];

        if (startIdx === undefined || endIdx === undefined) continue;

        const startVertex = vertices[startIdx];
        const endVertex = vertices[endIdx];

        if (startVertex && endVertex && endIdx > startIdx) {
          segments.push({
            path,
            startVertex,
            endVertex,
          });
        }
      }
    }

    return segments;
  }

  /**
   * Subdivides a single segment at its midpoint.
   *
   * @param network - The flip edge network
   * @param segment - The segment to subdivide
   * @returns True if subdivision was successful
   */
  private static subdivideSegment(
    network: FlipEdgeNetwork,
    segment: { path: GeodesicPath; startVertex: Vertex; endVertex: Vertex }
  ): boolean {
    // Find the midpoint of the segment
    const midpoint = this.findSegmentMidpoint(network, segment);

    if (!midpoint) {
      return false;
    }

    // If midpoint is already on a vertex, mark it
    const midpointVertex = midpoint.getVertex();
    if (midpointVertex) {
      network.markedVertices.add(midpointVertex.id);
      return true;
    }

    // Otherwise, we need to insert a new vertex at the midpoint
    // This requires vertex insertion, which is not yet implemented
    // For now, we'll just mark the nearest vertex
    const nearestVertex = this.findNearestVertex(network, segment.path, midpoint);
    if (nearestVertex) {
      network.markedVertices.add(nearestVertex.id);
      return true;
    }

    return false;
  }

  /**
   * Finds the midpoint of a path segment.
   *
   * @param network - The flip edge network
   * @param segment - The segment
   * @returns Surface point at the midpoint, or null if not found
   */
  private static findSegmentMidpoint(
    _network: FlipEdgeNetwork,
    segment: { path: GeodesicPath; startVertex: Vertex; endVertex: Vertex }
  ): SurfacePoint | null {
    const { path, startVertex, endVertex } = segment;

    // Find indices of start and end vertices in the path
    const vertices = path.getVertices();
    const startIdx = vertices.findIndex((v) => v.id === startVertex.id);
    const endIdx = vertices.findIndex((v) => v.id === endVertex.id);

    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      return null;
    }

    // Calculate total length of the segment
    let totalLength = 0;
    for (let i = startIdx; i < endIdx; i++) {
      const edge = path.edges[i];
      if (edge) {
        totalLength += edge.length;
      }
    }

    const halfLength = totalLength / 2;

    // Walk along the path to find the midpoint
    let accumulatedLength = 0;
    for (let i = startIdx; i < endIdx; i++) {
      const edge = path.edges[i];
      if (!edge) continue;

      const edgeLength = edge.length;

      if (accumulatedLength + edgeLength >= halfLength) {
        // Midpoint is on this edge
        // const _t = (halfLength - accumulatedLength) / edgeLength;

        // Get the vertices of this edge
        const v1 = vertices[i];
        const v2 = vertices[i + 1];

        if (!v1 || !v2) continue;

        // Find a face containing this edge
        const halfedge = v1.halfedge;
        if (!halfedge || !halfedge.face) continue;

        // Create surface point on the edge
        // For now, use a simple interpolation in the face
        // This is an approximation - proper implementation would trace the geodesic
        const face = halfedge.face;
        return SurfacePoint.fromFaceCenter(face);
      }

      accumulatedLength += edgeLength;
    }

    return null;
  }

  /**
   * Finds the nearest vertex to a surface point along a path.
   *
   * @param network - The flip edge network
   * @param path - The geodesic path
   * @param point - The surface point
   * @returns Nearest vertex, or null if not found
   */
  private static findNearestVertex(
    _network: FlipEdgeNetwork,
    path: GeodesicPath,
    _point: SurfacePoint
  ): Vertex | null {
    // Get vertices along the path
    const vertices = path.getVertices();

    if (vertices.length === 0) {
      return null;
    }

    // Simple heuristic: return the middle vertex
    const middleIdx = Math.floor(vertices.length / 2);
    const middleVertex = vertices[middleIdx];

    return middleVertex || null;
  }

  /**
   * Subdivides all paths when no marked vertices exist.
   *
   * @param network - The flip edge network
   * @returns Number of subdivisions performed
   */
  private static subdivideAllPaths(network: FlipEdgeNetwork): number {
    let count = 0;

    for (const path of network.paths) {
      const vertices = path.getVertices();

      if (vertices.length < 3) {
        continue; // Path too short to subdivide
      }

      // Mark the middle vertex
      const middleIdx = Math.floor(vertices.length / 2);
      const middleVertex = vertices[middleIdx];

      if (middleVertex) {
        network.markedVertices.add(middleVertex.id);
        count++;
      }
    }

    return count;
  }

  /**
   * Clears all marked vertices from the network.
   *
   * @param network - The flip edge network
   */
  static clearMarkedVertices(network: FlipEdgeNetwork): void {
    network.markedVertices.clear();
  }

  /**
   * Gets all marked vertex IDs.
   *
   * @param network - The flip edge network
   * @returns Array of marked vertex IDs
   */
  static getMarkedVertexIds(network: FlipEdgeNetwork): VertexId[] {
    return Array.from(network.markedVertices);
  }
}
