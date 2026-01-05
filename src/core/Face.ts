import type { FaceId } from '../types';
import type { Halfedge } from './Edge';
import type { Vertex } from './Vertex';
import { GeometricUtils } from '../geometry/GeometricUtils';

/**
 * Represents a triangular face in the mesh.
 */
export class Face {
  /**
   * One of the three halfedges bounding this face.
   * The other halfedges can be found by following the next pointers.
   */
  public halfedge: Halfedge;

  constructor(
    /**
     * Unique identifier for this face.
     */
    public readonly id: FaceId,

    /**
     * One of the halfedges bounding this face.
     */
    halfedge: Halfedge
  ) {
    this.halfedge = halfedge;
  }

  /**
   * Gets all three vertices of this triangular face.
   * Returns them in counter-clockwise order.
   */
  getVertices(): [Vertex, Vertex, Vertex] | null {
    const he0 = this.halfedge;
    const he1 = he0.next;
    const he2 = he1?.next;

    if (!he1 || !he2) {
      return null;
    }

    const v0 = he0.vertex;
    const v1 = he1.vertex;
    const v2 = he2.vertex;

    return [v0, v1, v2];
  }

  /**
   * Gets all three halfedges of this face in counter-clockwise order.
   */
  getHalfedges(): [Halfedge, Halfedge, Halfedge] | null {
    const he0 = this.halfedge;
    const he1 = he0.next;
    const he2 = he1?.next;

    if (!he1 || !he2) {
      return null;
    }

    return [he0, he1, he2];
  }

  /**
   * Gets all three edge lengths of this face.
   * Returns [length01, length12, length20] where lengthXY is the edge from vertex X to Y.
   */
  getEdgeLengths(): [number, number, number] | null {
    const halfedges = this.getHalfedges();
    if (!halfedges) {
      return null;
    }

    const [he0, he1, he2] = halfedges;

    return [he0.edge.length, he1.edge.length, he2.edge.length];
  }

  /**
   * Computes the three interior angles of this face using the law of cosines.
   * Returns angles in radians in the order [angle0, angle1, angle2].
   * angleI is the interior angle at the vertex pointed to by halfedge I.
   */
  getAngles(): [number, number, number] | null {
    const lengths = this.getEdgeLengths();
    if (!lengths) {
      return null;
    }

    const [len01, len12, len20] = lengths;

    try {
      // Angle at vertex 0 (opposite to edge 12)
      const angle0 = GeometricUtils.angleFromSides(len12, len20, len01);

      // Angle at vertex 1 (opposite to edge 20)
      const angle1 = GeometricUtils.angleFromSides(len20, len01, len12);

      // Angle at vertex 2 (opposite to edge 01)
      const angle2 = GeometricUtils.angleFromSides(len01, len12, len20);

      return [angle0, angle1, angle2];
    } catch {
      return null;
    }
  }

  /**
   * Computes the angle at a specific vertex in this face.
   *
   * @param vertex - The vertex to compute the angle at
   * @returns Angle in radians, or null if vertex is not in this face
   */
  getAngleAtVertex(vertex: Vertex): number | null {
    const vertices = this.getVertices();
    const angles = this.getAngles();

    if (!vertices || !angles) {
      return null;
    }

    const [v0, v1, v2] = vertices;
    const [angle0, angle1, angle2] = angles;

    if (vertex.id === v0.id) {
      return angle0;
    } else if (vertex.id === v1.id) {
      return angle1;
    } else if (vertex.id === v2.id) {
      return angle2;
    }

    return null;
  }

  /**
   * Computes the area of this face using Heron's formula.
   */
  getArea(): number | null {
    const lengths = this.getEdgeLengths();
    if (!lengths) {
      return null;
    }

    const [a, b, c] = lengths;

    try {
      return GeometricUtils.triangleArea(a, b, c);
    } catch {
      return null;
    }
  }

  /**
   * Checks if this face contains a given vertex.
   */
  containsVertex(vertex: Vertex): boolean {
    const vertices = this.getVertices();
    if (!vertices) {
      return false;
    }

    const [v0, v1, v2] = vertices;
    return vertex.id === v0.id || vertex.id === v1.id || vertex.id === v2.id;
  }

  /**
   * Gets the halfedge in this face that starts from the given vertex.
   */
  getHalfedgeFromVertex(vertex: Vertex): Halfedge | null {
    const halfedges = this.getHalfedges();
    if (!halfedges) {
      return null;
    }

    for (const he of halfedges) {
      const sourceVertex = he.getSourceVertex();
      if (sourceVertex && sourceVertex.id === vertex.id) {
        return he;
      }
    }

    return null;
  }

  /**
   * Gets the halfedge opposite to a given vertex in this face.
   * This is the edge that does not touch the given vertex.
   */
  getOppositeHalfedge(vertex: Vertex): Halfedge | null {
    const halfedges = this.getHalfedges();
    if (!halfedges) {
      return null;
    }

    // Find the halfedge where neither endpoint is the given vertex
    // For a halfedge he in a triangle loop:
    // - Target is he.vertex (where the halfedge points to)
    // - Source is the previous vertex in the loop, which is he.prev.vertex if prev exists
    for (const he of halfedges) {
      const target = he.vertex;
      const source = he.prev?.vertex;

      if (!source) {
        continue;
      }

      if (target.id !== vertex.id && source.id !== vertex.id) {
        return he;
      }
    }

    return null;
  }

  /**
   * Gets the angle at the vertex that is NOT the given vertex and NOT adjacent to it.
   * Used for Delaunay condition checking: given an edge vertex, returns the angle
   * at the third vertex of the triangle (the vertex not on that edge).
   */
  getOppositeAngle(edgeVertex: Vertex): number | null {
    const angles = this.getAngles();
    const vertices = this.getVertices();

    if (!angles || !vertices) {
      return null;
    }

    // Find the vertex that is opposite to the edge containing edgeVertex
    // In a triangle, if we have an edge, the third vertex is the one
    // that doesn't share that edge
    const oppositeHe = this.getOppositeHalfedge(edgeVertex);
    if (!oppositeHe) {
      return null;
    }

    // The opposite halfedge points TO the opposite vertex
    const oppositeVertex = oppositeHe.vertex;

    // Find the index of the opposite vertex
    const index = vertices.findIndex((v) => v.id === oppositeVertex.id);
    if (index === -1) {
      return null;
    }

    return angles[index]!;
  }
}
