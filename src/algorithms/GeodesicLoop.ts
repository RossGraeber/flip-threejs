import type { Edge, Halfedge } from '../core/Edge';
import type { Vertex } from '../core/Vertex';
import type { Face } from '../core/Face';
import type { SignpostData } from './SignpostData';

/**
 * Represents a closed geodesic loop on a triangulated mesh as a sequence of edges.
 *
 * Unlike GeodesicPath which has distinct start and end vertices, a GeodesicLoop
 * is closed - it starts and ends at the same vertex (baseVertex). Importantly,
 * the baseVertex is also considered an interior vertex for geodesic shortening,
 * meaning the angle at the baseVertex should also be >= pi for a true geodesic.
 */
export class GeodesicLoop {
  /**
   * Sequence of edges forming the closed loop.
   * The loop starts at baseVertex, follows these edges, and returns to baseVertex.
   */
  edges: Edge[];

  /**
   * The vertex where the loop closes (start = end).
   * This vertex is also an interior vertex for geodesic computations.
   */
  readonly baseVertex: Vertex;

  /**
   * Total length of the loop.
   * Cached and updated when loop changes.
   */
  private cachedLength: number;

  /**
   * Creates a new geodesic loop.
   *
   * @param edges - Sequence of edges forming the closed loop
   * @param baseVertex - The vertex where the loop starts and ends
   */
  constructor(edges: Edge[], baseVertex: Vertex) {
    if (edges.length < 3) {
      throw new Error('A geodesic loop must have at least 3 edges');
    }

    this.edges = edges;
    this.baseVertex = baseVertex;
    this.cachedLength = this.computeLength();

    // Validate that the loop is actually closed
    this.validateClosure();
  }

  /**
   * Validates that the loop is properly closed.
   * The first edge should start from baseVertex and the last edge should end at baseVertex.
   */
  private validateClosure(): void {
    if (this.edges.length === 0) {
      throw new Error('Loop must have at least one edge');
    }

    // Check first edge connects to baseVertex
    const firstEdge = this.edges[0]!;
    const firstEdgeVertices = firstEdge.getVertices();
    if (!firstEdgeVertices[0] || !firstEdgeVertices[1]) {
      throw new Error('First edge has invalid vertices');
    }

    const startsFromBase =
      firstEdgeVertices[0].id === this.baseVertex.id ||
      firstEdgeVertices[1].id === this.baseVertex.id;

    if (!startsFromBase) {
      throw new Error('First edge must be connected to baseVertex');
    }

    // Check last edge connects back to baseVertex
    const lastEdge = this.edges[this.edges.length - 1]!;
    const lastEdgeVertices = lastEdge.getVertices();
    if (!lastEdgeVertices[0] || !lastEdgeVertices[1]) {
      throw new Error('Last edge has invalid vertices');
    }

    const endsAtBase =
      lastEdgeVertices[0].id === this.baseVertex.id ||
      lastEdgeVertices[1].id === this.baseVertex.id;

    if (!endsAtBase) {
      throw new Error('Last edge must be connected to baseVertex');
    }
  }

  /**
   * Gets the total length of the loop.
   */
  get length(): number {
    return this.cachedLength;
  }

  /**
   * Recomputes and updates the cached length.
   */
  updateLength(): void {
    this.cachedLength = this.computeLength();
  }

  /**
   * Computes the total length of the loop.
   */
  private computeLength(): number {
    return this.edges.reduce((sum, edge) => sum + edge.length, 0);
  }

  /**
   * Gets all vertices along the loop in order.
   * The baseVertex appears only at the start (not duplicated at the end).
   */
  getVertices(): Vertex[] {
    if (this.edges.length === 0) {
      return [this.baseVertex];
    }

    const vertices: Vertex[] = [this.baseVertex];
    let currentVertex = this.baseVertex;

    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges[i]!;
      const nextVertex = edge.getOtherVertex(currentVertex);

      if (!nextVertex) {
        // Fallback: try to find the other vertex by ID comparison
        const edgeVertices = edge.getVertices();
        const v0 = edgeVertices[0];
        const v1 = edgeVertices[1];
        if (!v0 || !v1) {
          throw new Error(`Edge ${i} has invalid vertices`);
        }
        const fallbackNext = v0.id === currentVertex.id ? v1 : v0;

        // Don't add baseVertex at the end (it's a closed loop)
        if (i < this.edges.length - 1) {
          vertices.push(fallbackNext);
        }
        currentVertex = fallbackNext;
      } else {
        // Don't add baseVertex at the end (it's a closed loop)
        if (i < this.edges.length - 1) {
          vertices.push(nextVertex);
        }
        currentVertex = nextVertex;
      }
    }

    return vertices;
  }

  /**
   * Gets all interior vertices of the loop.
   * For a loop, ALL vertices are interior (including baseVertex),
   * because the path angle at every vertex should be >= pi for a geodesic.
   */
  getInteriorVertices(): Vertex[] {
    return this.getVertices();
  }

  /**
   * Gets the index of a vertex in the loop.
   *
   * @param vertex - The vertex to find
   * @returns Index, or -1 if not found
   */
  getVertexIndex(vertex: Vertex): number {
    const vertices = this.getVertices();
    return vertices.findIndex((v) => v.id === vertex.id);
  }

  /**
   * Checks if the loop contains a vertex.
   *
   * @param vertex - The vertex to check
   * @returns True if loop contains vertex
   */
  containsVertex(vertex: Vertex): boolean {
    return this.getVertexIndex(vertex) !== -1;
  }

  /**
   * Checks if the loop contains an edge.
   *
   * @param edge - The edge to check
   * @returns True if loop contains edge
   */
  containsEdge(edge: Edge): boolean {
    return this.edges.some((e) => e.id === edge.id);
  }

  /**
   * Gets the incoming and outgoing edges at a vertex in the loop.
   *
   * @param vertex - The vertex (must be in the loop)
   * @returns Object containing incoming and outgoing edges
   */
  getEdgesAtVertex(vertex: Vertex): { incoming: Edge; outgoing: Edge } | null {
    const index = this.getVertexIndex(vertex);
    if (index === -1) {
      return null;
    }

    const n = this.edges.length;

    // For the baseVertex (index 0), incoming is the last edge, outgoing is the first
    // For other vertices, incoming is the edge before, outgoing is the edge after
    const incomingIndex = index === 0 ? n - 1 : index - 1;
    const outgoingIndex = index;

    return {
      incoming: this.edges[incomingIndex]!,
      outgoing: this.edges[outgoingIndex]!,
    };
  }

  /**
   * Gets the halfedge pointing TO a vertex along the loop direction.
   *
   * @param edge - The edge
   * @param vertex - The target vertex
   * @returns The halfedge pointing to the vertex
   */
  getHalfedgePointingTo(edge: Edge, vertex: Vertex): Halfedge | null {
    const he = edge.halfedge;
    if (he.vertex.id === vertex.id) {
      return he;
    }
    if (he.twin && he.twin.vertex.id === vertex.id) {
      return he.twin;
    }
    return null;
  }

  /**
   * Gets the halfedge pointing FROM a vertex along the loop direction.
   *
   * @param edge - The edge
   * @param vertex - The source vertex
   * @returns The halfedge pointing from the vertex
   */
  getHalfedgePointingFrom(edge: Edge, vertex: Vertex): Halfedge | null {
    const he = edge.halfedge;
    const heSource = he.getSourceVertex();

    if (heSource && heSource.id === vertex.id) {
      return he;
    }
    if (he.twin) {
      const twinSource = he.twin.getSourceVertex();
      if (twinSource && twinSource.id === vertex.id) {
        return he.twin;
      }
    }
    return null;
  }

  /**
   * Gets the loop angle at a vertex using signpost data.
   * This is the angle between the incoming and outgoing edges at the vertex,
   * measured on the "inside" of the loop (counter-clockwise from incoming to outgoing).
   *
   * For a geodesic loop, this angle should be >= pi at all interior vertices
   * (which includes all vertices in a loop).
   *
   * @param vertex - The vertex (must be in the loop)
   * @param signpostData - The signpost data for angle computation
   * @returns Angle in radians
   */
  getAngleAtVertex(vertex: Vertex, signpostData: SignpostData): number {
    const edgesAtVertex = this.getEdgesAtVertex(vertex);
    if (!edgesAtVertex) {
      throw new Error('Vertex must be in the loop');
    }

    const { incoming, outgoing } = edgesAtVertex;

    // Get halfedge pointing TO this vertex (end of incoming edge)
    const incomingHe = this.getHalfedgePointingTo(incoming, vertex);
    if (!incomingHe) {
      throw new Error('Could not find incoming halfedge');
    }

    // Get halfedge pointing FROM this vertex (start of outgoing edge)
    const outgoingHe = this.getHalfedgePointingFrom(outgoing, vertex);
    if (!outgoingHe) {
      throw new Error('Could not find outgoing halfedge');
    }

    // The path angle is measured from the incoming direction to the outgoing direction.
    // We need to use the twin of the incoming halfedge (which points FROM this vertex
    // in the opposite direction of the incoming edge).
    const incomingTwin = incomingHe.twin;
    if (!incomingTwin) {
      throw new Error('Incoming halfedge has no twin');
    }

    // Compute angle from incoming direction to outgoing direction
    // using signpost data (counter-clockwise)
    return signpostData.getAngleBetween(incomingTwin, outgoingHe);
  }

  /**
   * Creates a deep copy of this loop.
   */
  clone(): GeodesicLoop {
    return new GeodesicLoop([...this.edges], this.baseVertex);
  }

  /**
   * Gets the edges adjacent to the loop on either side.
   * Useful for mesh segmentation.
   *
   * @returns Object with leftFaces and rightFaces arrays
   */
  getAdjacentFaces(): {
    left: Face[];
    right: Face[];
  } {
    const leftFaces: Face[] = [];
    const rightFaces: Face[] = [];

    const vertices = this.getVertices();

    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges[i]!;
      const currentVertex = vertices[i]!;

      // Get the halfedge pointing in the direction of the loop
      const he = this.getHalfedgePointingFrom(edge, currentVertex);
      if (!he) continue;

      // Left face is the face of this halfedge
      if (he.face) {
        leftFaces.push(he.face);
      }

      // Right face is the face of the twin
      if (he.twin && he.twin.face) {
        rightFaces.push(he.twin.face);
      }
    }

    return { left: leftFaces, right: rightFaces };
  }
}
