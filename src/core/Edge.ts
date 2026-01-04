import type { EdgeId, HalfedgeId, VertexId, FaceId } from '../types';
import type { Vertex } from './Vertex';
import type { Face } from './Face';

/**
 * Represents a halfedge in the mesh.
 * A halfedge is a directed edge from one vertex to another.
 */
export class Halfedge {
  /**
   * The vertex this halfedge points to (target vertex).
   */
  public vertex: Vertex;

  /**
   * The opposite halfedge (same edge, opposite direction).
   */
  public twin: Halfedge | null = null;

  /**
   * The next halfedge in the face loop (counter-clockwise).
   */
  public next: Halfedge | null = null;

  /**
   * The previous halfedge in the face loop.
   */
  public prev: Halfedge | null = null;

  /**
   * The face this halfedge belongs to (null for boundary halfedges).
   */
  public face: Face | null = null;

  /**
   * The parent undirected edge.
   */
  public edge: Edge;

  constructor(
    /**
     * Unique identifier for this halfedge.
     */
    public readonly id: HalfedgeId,

    /**
     * The vertex this halfedge points to.
     */
    vertex: Vertex,

    /**
     * The parent edge.
     */
    edge: Edge
  ) {
    this.vertex = vertex;
    this.edge = edge;
  }

  /**
   * Gets the source vertex of this halfedge (the vertex it starts from).
   * This is the target vertex of the twin halfedge.
   */
  getSourceVertex(): Vertex | null {
    return this.twin?.vertex ?? null;
  }

  /**
   * Gets the target vertex of this halfedge.
   */
  getTargetVertex(): Vertex {
    return this.vertex;
  }

  /**
   * Checks if this halfedge is on the boundary (has no face).
   */
  isBoundary(): boolean {
    return this.face === null;
  }

  /**
   * Gets the opposite halfedge in the same face (two edges away).
   * For a triangle, this is the edge opposite to this halfedge.
   */
  getOppositeHalfedge(): Halfedge | null {
    return this.next?.next ?? null;
  }
}

/**
 * Represents an undirected edge in the mesh.
 * An edge consists of two halfedges (twins).
 */
export class Edge {
  /**
   * One of the two halfedges comprising this edge.
   */
  public halfedge: Halfedge;

  /**
   * The intrinsic length of this edge.
   * This may differ from the Euclidean distance after edge flips.
   */
  public length: number;

  /**
   * Whether this edge is part of any path in a network.
   */
  public isInPath: boolean = false;

  constructor(
    /**
     * Unique identifier for this edge.
     */
    public readonly id: EdgeId,

    /**
     * One of the two halfedges.
     */
    halfedge: Halfedge,

    /**
     * Initial edge length.
     */
    length: number
  ) {
    this.halfedge = halfedge;
    this.length = length;
  }

  /**
   * Gets both vertices of this edge.
   * Returns [v0, v1] where v0 is the source of halfedge and v1 is the target.
   */
  getVertices(): [Vertex, Vertex] | [null, null] {
    const v0 = this.halfedge.getSourceVertex();
    const v1 = this.halfedge.getTargetVertex();

    if (!v0) {
      return [null, null];
    }

    return [v0, v1];
  }

  /**
   * Gets both faces adjacent to this edge.
   * Returns [f0, f1] where f0 is the face of halfedge and f1 is the face of twin.
   * Either face can be null for boundary edges.
   */
  getFaces(): [Face | null, Face | null] {
    const f0 = this.halfedge.face;
    const f1 = this.halfedge.twin?.face ?? null;
    return [f0, f1];
  }

  /**
   * Checks if this edge is on the boundary (has only one adjacent face).
   */
  isBoundary(): boolean {
    return this.halfedge.face === null || this.halfedge.twin?.face === null;
  }

  /**
   * Checks if this edge can be flipped.
   * An edge can be flipped if:
   * 1. It has two adjacent faces (not a boundary edge)
   * 2. Both endpoints have degree > 1
   * 3. The quadrilateral formed is convex
   */
  canFlip(): boolean {
    // Check if edge has two faces
    if (this.isBoundary()) {
      return false;
    }

    // Check vertex degrees
    const [v0, v1] = this.getVertices();
    if (!v0 || !v1) {
      return false;
    }

    const degree0 = v0.degree();
    const degree1 = v1.degree();

    if (degree0 === null || degree1 === null || degree0 <= 1 || degree1 <= 1) {
      return false;
    }

    // Convexity check would require geometric information (done in EdgeFlip algorithm)
    return true;
  }

  /**
   * Gets the other vertex of this edge (given one vertex).
   */
  getOtherVertex(v: Vertex): Vertex | null {
    const [v0, v1] = this.getVertices();
    if (!v0 || !v1) {
      return null;
    }

    if (v.id === v0.id) {
      return v1;
    } else if (v.id === v1.id) {
      return v0;
    }

    return null;
  }
}
