import type { Face } from '../core/Face';
import type { Edge } from '../core/Edge';
import type { Vertex } from '../core/Vertex';
import { GeometricUtils } from './GeometricUtils';

/**
 * Represents a point on the surface of a triangulated mesh.
 * Uses face + barycentric coordinates for intrinsic representation.
 */
export class SurfacePoint {
  /**
   * The face containing this point.
   */
  readonly face: Face;

  /**
   * Barycentric coordinates [u, v, w] where u + v + w = 1.
   * Corresponds to the three vertices of the face in order.
   */
  readonly barycentricCoords: [number, number, number];

  /**
   * Creates a new surface point.
   *
   * @param face - The face containing the point
   * @param barycentricCoords - Barycentric coordinates [u, v, w] (must sum to 1)
   */
  constructor(face: Face, barycentricCoords: [number, number, number]) {
    this.face = face;
    this.barycentricCoords = barycentricCoords;

    // Validate that coordinates sum to 1 (within tolerance)
    const sum = barycentricCoords[0] + barycentricCoords[1] + barycentricCoords[2];
    if (Math.abs(sum - 1) > 1e-10) {
      throw new Error(`Barycentric coordinates must sum to 1, got ${sum}`);
    }
  }

  /**
   * Converts this surface point to 3D Cartesian coordinates.
   *
   * @returns 3D coordinates as a plain object
   */
  toVector3(): { x: number; y: number; z: number } {
    const vertices = this.face.getVertices();
    const [u, v, w] = this.barycentricCoords;

    if (!vertices || vertices.length < 3) {
      throw new Error('Face must have at least 3 vertices');
    }

    const v0 = vertices[0];
    const v1 = vertices[1];
    const v2 = vertices[2];

    if (!v0 || !v1 || !v2) {
      throw new Error('Face vertices cannot be null');
    }

    return GeometricUtils.barycentricToCartesian3D(u, v, w, v0.position, v1.position, v2.position);
  }

  /**
   * Checks if this point lies on an edge of the face.
   * A point is on an edge if one barycentric coordinate is (approximately) zero.
   *
   * @param tolerance - Tolerance for zero comparison
   * @returns True if point is on an edge
   */
  isOnEdge(tolerance = 1e-10): boolean {
    const [u, v, w] = this.barycentricCoords;
    return u < tolerance || v < tolerance || w < tolerance;
  }

  /**
   * Checks if this point lies on a vertex of the face.
   * A point is on a vertex if two barycentric coordinates are (approximately) zero.
   *
   * @param tolerance - Tolerance for zero comparison
   * @returns True if point is on a vertex
   */
  isOnVertex(tolerance = 1e-10): boolean {
    const [u, v, w] = this.barycentricCoords;
    let zeroCount = 0;
    if (u < tolerance) zeroCount++;
    if (v < tolerance) zeroCount++;
    if (w < tolerance) zeroCount++;
    return zeroCount >= 2;
  }

  /**
   * Gets the edge this point lies on, if any.
   *
   * @param tolerance - Tolerance for edge detection
   * @returns The edge, or null if not on an edge
   */
  getEdge(tolerance = 1e-10): Edge | null {
    if (!this.isOnEdge(tolerance)) {
      return null;
    }

    const [u, v, w] = this.barycentricCoords;
    const halfedges = this.face.getHalfedges();

    if (!halfedges || halfedges.length < 3) {
      return null;
    }

    // u ≈ 0: point is on edge opposite to vertex 0 (edge between v1 and v2)
    if (u < tolerance && halfedges[1]) {
      return halfedges[1].edge;
    }

    // v ≈ 0: point is on edge opposite to vertex 1 (edge between v2 and v0)
    if (v < tolerance && halfedges[2]) {
      return halfedges[2].edge;
    }

    // w ≈ 0: point is on edge opposite to vertex 2 (edge between v0 and v1)
    if (w < tolerance && halfedges[0]) {
      return halfedges[0].edge;
    }

    return null;
  }

  /**
   * Gets the vertex this point lies on, if any.
   *
   * @param tolerance - Tolerance for vertex detection
   * @returns The vertex, or null if not on a vertex
   */
  getVertex(tolerance = 1e-10): Vertex | null {
    if (!this.isOnVertex(tolerance)) {
      return null;
    }

    const [u, v, w] = this.barycentricCoords;
    const vertices = this.face.getVertices();

    if (!vertices || vertices.length < 3) {
      return null;
    }

    // Only one coordinate is ≈ 1, others are ≈ 0
    if (u > 1 - tolerance && vertices[0]) {
      return vertices[0];
    }

    if (v > 1 - tolerance && vertices[1]) {
      return vertices[1];
    }

    if (w > 1 - tolerance && vertices[2]) {
      return vertices[2];
    }

    return null;
  }

  /**
   * Creates a surface point from a vertex.
   *
   * @param vertex - The vertex
   * @param face - A face incident to the vertex
   * @returns Surface point at the vertex
   */
  static fromVertex(vertex: Vertex, face: Face): SurfacePoint {
    const vertices = face.getVertices();

    if (!vertices) {
      throw new Error('Face has no vertices');
    }

    const index = vertices.findIndex((v) => v.id === vertex.id);

    if (index === -1) {
      throw new Error('Vertex is not part of the specified face');
    }

    // Set barycentric coordinate to 1 for this vertex, 0 for others
    const coords: [number, number, number] = [0, 0, 0];
    coords[index] = 1;

    return new SurfacePoint(face, coords);
  }

  /**
   * Creates a surface point at the midpoint of an edge.
   *
   * @param edge - The edge
   * @param face - A face incident to the edge
   * @returns Surface point at the edge midpoint
   */
  static fromEdgeMidpoint(edge: Edge, face: Face): SurfacePoint {
    const halfedges = face.getHalfedges();

    if (!halfedges) {
      throw new Error('Face has no halfedges');
    }

    // Find which edge this is in the face
    for (let i = 0; i < halfedges.length && i < 3; i++) {
      const he = halfedges[i];
      if (he && he.edge.id === edge.id) {
        // This halfedge's edge matches
        // The edge connects vertices i and (i+1)%3
        const coords: [number, number, number] = [0, 0, 0];
        coords[i] = 0.5;
        coords[(i + 1) % 3] = 0.5;
        return new SurfacePoint(face, coords);
      }
    }

    throw new Error('Edge is not part of the specified face');
  }

  /**
   * Creates a surface point at the center (centroid) of a face.
   *
   * @param face - The face
   * @returns Surface point at the face center
   */
  static fromFaceCenter(face: Face): SurfacePoint {
    return new SurfacePoint(face, [1 / 3, 1 / 3, 1 / 3]);
  }
}
