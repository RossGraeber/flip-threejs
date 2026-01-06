import type { Edge } from '../core/Edge';
import type { Vertex } from '../core/Vertex';
import type { SurfacePoint } from '../geometry/SurfacePoint';

/**
 * Represents a geodesic path on a triangulated mesh as a sequence of edges.
 */
export class GeodesicPath {
  /**
   * Sequence of edges forming the path.
   */
  edges: Edge[];

  /**
   * Start vertex of the path.
   */
  readonly startVertex: Vertex;

  /**
   * End vertex of the path.
   */
  readonly endVertex: Vertex;

  /**
   * Total length of the path.
   * Cached and updated when path changes.
   */
  private cachedLength: number;

  /**
   * Creates a new geodesic path.
   *
   * @param edges - Sequence of edges forming the path
   * @param startVertex - Start vertex
   * @param endVertex - End vertex
   */
  constructor(edges: Edge[], startVertex: Vertex, endVertex: Vertex) {
    this.edges = edges;
    this.startVertex = startVertex;
    this.endVertex = endVertex;
    this.cachedLength = this.computeLength();
  }

  /**
   * Gets the total length of the path.
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
   * Computes the total length of the path.
   */
  private computeLength(): number {
    return this.edges.reduce((sum, edge) => sum + edge.length, 0);
  }

  /**
   * Gets all vertices along the path (including start and end).
   * Vertices are in order from start to end.
   */
  getVertices(): Vertex[] {
    if (this.edges.length === 0) {
      return [this.startVertex];
    }

    const vertices: Vertex[] = [this.startVertex];
    let currentVertex = this.startVertex;

    for (const edge of this.edges) {
      // Get the other vertex of this edge using the edge's method
      const nextVertex = edge.getOtherVertex(currentVertex);
      if (!nextVertex) {
        // Fallback: try to find the other vertex by ID comparison
        const edgeVertices = edge.getVertices();
        const v0 = edgeVertices[0];
        const v1 = edgeVertices[1];
        if (!v0 || !v1) {
          throw new Error('Edge has invalid vertices');
        }
        const fallbackNext = v0.id === currentVertex.id ? v1 : v0;
        vertices.push(fallbackNext);
        currentVertex = fallbackNext;
      } else {
        vertices.push(nextVertex);
        currentVertex = nextVertex;
      }
    }

    return vertices;
  }

  /**
   * Gets interior vertices (excluding start and end).
   */
  getInteriorVertices(): Vertex[] {
    const vertices = this.getVertices();
    return vertices.slice(1, -1);
  }

  /**
   * Gets the index of a vertex in the path.
   *
   * @param vertex - The vertex to find
   * @returns Index, or -1 if not found
   */
  getVertexIndex(vertex: Vertex): number {
    const vertices = this.getVertices();
    return vertices.findIndex((v) => v.id === vertex.id);
  }

  /**
   * Checks if the path contains a vertex.
   *
   * @param vertex - The vertex to check
   * @returns True if path contains vertex
   */
  containsVertex(vertex: Vertex): boolean {
    return this.getVertexIndex(vertex) !== -1;
  }

  /**
   * Checks if the path contains an edge.
   *
   * @param edge - The edge to check
   * @returns True if path contains edge
   */
  containsEdge(edge: Edge): boolean {
    return this.edges.some((e) => e.id === edge.id);
  }

  /**
   * Gets the path angle at a vertex.
   * This is the angle between the incoming and outgoing edges at the vertex.
   *
   * For a geodesic path, this angle should be ≥ π (180 degrees) at all interior vertices.
   *
   * @param vertex - The vertex (must be an interior vertex)
   * @returns Angle in radians
   */
  getAngleAtVertex(vertex: Vertex): number {
    const index = this.getVertexIndex(vertex);

    if (index <= 0 || index >= this.edges.length) {
      throw new Error('Vertex must be an interior vertex of the path');
    }

    const incomingEdge = this.edges[index - 1]!;
    const outgoingEdge = this.edges[index]!;

    // Get the two faces sharing these edges
    const inHalfedge = incomingEdge.halfedge;
    const outHalfedge = outgoingEdge.halfedge;

    // Find the correct halfedges that meet at this vertex
    let inHe = inHalfedge;
    if (inHe.next!.vertex.id !== vertex.id) {
      inHe = inHalfedge.twin!;
    }

    let outHe = outHalfedge;
    if (outHe.vertex.id !== vertex.id) {
      outHe = outHalfedge.twin!;
    }

    // The path angle is π minus the sum of angles in faces on the "inside" of the path
    // This is a complex computation that requires signpost data
    // For now, return a placeholder that will be properly computed with signpost data
    return Math.PI; // Placeholder - will be properly implemented with SignpostData
  }

  /**
   * Converts the path to a sequence of surface points.
   * This will be implemented once TraceGeodesic is available.
   *
   * @returns Array of surface points along the path
   */
  toSurfacePolyline(): SurfacePoint[] {
    // TODO: Implement with TraceGeodesic utilities
    throw new Error('toSurfacePolyline not yet implemented - requires TraceGeodesic');
  }

  /**
   * Converts the path to an array of 3D coordinates.
   * This will be implemented once TraceGeodesic is available.
   *
   * @returns Array of 3D points along the path
   */
  toVector3Array(): Array<{ x: number; y: number; z: number }> {
    // TODO: Implement with TraceGeodesic utilities
    throw new Error('toVector3Array not yet implemented - requires TraceGeodesic');
  }

  /**
   * Creates a copy of this path.
   */
  clone(): GeodesicPath {
    return new GeodesicPath([...this.edges], this.startVertex, this.endVertex);
  }
}
