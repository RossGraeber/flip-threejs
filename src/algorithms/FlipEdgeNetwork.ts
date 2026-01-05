import type { BufferGeometry } from 'three';
import type { Vertex } from '../core/Vertex';
import type { Edge, Halfedge } from '../core/Edge';
import type { VertexId } from '../types';
import type { FlipEdgeNetworkOptions } from '../types/PathData';
import type { GeodesicPath } from './GeodesicPath';
import { IntrinsicTriangulation } from '../core/IntrinsicTriangulation';
import { SignpostData } from './SignpostData';
import { DijkstraShortestPath } from './DijkstraShortestPath';
import { SurfacePoint } from '../geometry/SurfacePoint';

/**
 * Main class for computing geodesic paths using the FlipOut algorithm.
 *
 * The FlipOut algorithm starts with an initial path (from Dijkstra) and
 * iteratively shortens it by flipping edges until it becomes a true geodesic.
 */
export class FlipEdgeNetwork {
  /**
   * The intrinsic triangulation.
   */
  readonly triangulation: IntrinsicTriangulation;

  /**
   * Signpost data for intrinsic geometry.
   */
  readonly signpostData: SignpostData;

  /**
   * Geodesic paths on the mesh.
   */
  paths: GeodesicPath[];

  /**
   * Marked vertices (e.g., Bezier control points) that should not be removed.
   */
  readonly markedVertices: Set<VertexId>;

  /**
   * Configuration options.
   */
  private readonly options: Required<FlipEdgeNetworkOptions>;

  /**
   * Default options.
   */
  private static readonly DEFAULT_OPTIONS: Required<FlipEdgeNetworkOptions> = {
    maxIterations: 10000,
    convergenceThreshold: 1e-10,
    bezierSubdivisionRounds: 0,
    enableDelaunayRefine: false,
    delaunayAngleThreshold: 0.1,
    delaunayMaxInsertions: 1000,
    delaunayMaxRounds: 25,
    polylineStepSize: 0.1,
    verbose: false,
  };

  /**
   * Creates a new FlipEdgeNetwork.
   *
   * @param triangulation - The intrinsic triangulation
   * @param paths - Initial geodesic paths
   * @param markedVertices - Set of marked vertices
   * @param options - Configuration options
   */
  constructor(
    triangulation: IntrinsicTriangulation,
    paths: GeodesicPath[],
    markedVertices: Set<VertexId> = new Set(),
    options: FlipEdgeNetworkOptions = {}
  ) {
    this.triangulation = triangulation;
    this.signpostData = new SignpostData(triangulation);
    this.paths = paths;
    this.markedVertices = markedVertices;
    this.options = { ...FlipEdgeNetwork.DEFAULT_OPTIONS, ...options };
  }

  /**
   * Creates a FlipEdgeNetwork from a Three.js BufferGeometry.
   * Initializes with an empty path set.
   *
   * @param geometry - The mesh geometry
   * @param options - Configuration options
   * @returns New FlipEdgeNetwork
   */
  static fromBufferGeometry(
    geometry: BufferGeometry,
    options: FlipEdgeNetworkOptions = {}
  ): FlipEdgeNetwork {
    const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);
    return new FlipEdgeNetwork(triangulation, [], new Set(), options);
  }

  /**
   * Creates a FlipEdgeNetwork with a Dijkstra path from source to target.
   *
   * @param geometry - The mesh geometry
   * @param sourceId - Source vertex ID
   * @param targetId - Target vertex ID
   * @param options - Configuration options
   * @returns New FlipEdgeNetwork with initial path
   */
  static fromDijkstraPath(
    geometry: BufferGeometry,
    sourceId: VertexId,
    targetId: VertexId,
    options: FlipEdgeNetworkOptions = {}
  ): FlipEdgeNetwork {
    const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);
    const dijkstra = new DijkstraShortestPath(triangulation);
    const path = dijkstra.computePath(sourceId, targetId);

    if (!path) {
      throw new Error(`No path exists from vertex ${sourceId} to ${targetId}`);
    }

    return new FlipEdgeNetwork(triangulation, [path], new Set(), options);
  }

  /**
   * Creates a FlipEdgeNetwork with a piecewise Dijkstra path through waypoints.
   *
   * @param geometry - The mesh geometry
   * @param waypoints - Array of vertex IDs to visit in order
   * @param markInterior - Whether to mark interior waypoints (for Bezier curves)
   * @param options - Configuration options
   * @returns New FlipEdgeNetwork with initial paths
   */
  static fromPiecewiseDijkstraPath(
    geometry: BufferGeometry,
    waypoints: VertexId[],
    markInterior = false,
    options: FlipEdgeNetworkOptions = {}
  ): FlipEdgeNetwork {
    const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);
    const dijkstra = new DijkstraShortestPath(triangulation);
    const paths = dijkstra.computePiecewisePath(waypoints);

    if (!paths) {
      throw new Error('Could not compute piecewise path through all waypoints');
    }

    const markedVertices = new Set<VertexId>();

    if (markInterior) {
      // Mark interior waypoints (not first or last)
      for (let i = 1; i < waypoints.length - 1; i++) {
        const waypointId = waypoints[i];
        if (waypointId !== undefined) {
          markedVertices.add(waypointId);
        }
      }
    }

    return new FlipEdgeNetwork(triangulation, paths, markedVertices, options);
  }

  /**
   * Gets the total length of all paths.
   */
  getLength(): number {
    return this.paths.reduce((sum, path) => sum + path.length, 0);
  }

  /**
   * Checks if an edge is part of any path.
   *
   * @param edge - The edge to check
   * @returns True if edge is in a path
   */
  edgeInPath(edge: Edge): boolean {
    return this.paths.some((path) => path.containsEdge(edge));
  }

  /**
   * Finds the minimum angle deviation from π across all path vertices.
   * For a perfect geodesic, all angles should be ≥ π.
   *
   * @returns Minimum angle (in radians)
   */
  minAngleIsotopy(): number {
    let minAngle = Infinity;

    for (const path of this.paths) {
      const interiorVertices = path.getInteriorVertices();

      for (const vertex of interiorVertices) {
        if (this.markedVertices.has(vertex.id)) {
          continue; // Skip marked vertices
        }

        const angle = path.getAngleAtVertex(vertex);
        minAngle = Math.min(minAngle, angle);
      }
    }

    return minAngle;
  }

  /**
   * Finds a flexible joint in the path.
   * A flexible joint is an interior vertex where the path angle is < π.
   *
   * @returns A flexible joint vertex, or null if none exists
   */
  findFlexibleJoint(): Vertex | null {
    for (const path of this.paths) {
      const interiorVertices = path.getInteriorVertices();

      for (const vertex of interiorVertices) {
        // Skip marked vertices (Bezier control points)
        if (this.markedVertices.has(vertex.id)) {
          continue;
        }

        // Check if this is a flexible joint
        if (!this.isLocallyGeodesic(vertex, path)) {
          return vertex;
        }
      }
    }

    return null;
  }

  /**
   * Checks if a path is locally geodesic at a vertex.
   * A path is locally geodesic if the angle at the vertex is ≥ π.
   *
   * @param vertex - The vertex to check
   * @param path - The path containing the vertex
   * @returns True if locally geodesic
   */
  isLocallyGeodesic(vertex: Vertex, path: GeodesicPath): boolean {
    try {
      const angle = path.getAngleAtVertex(vertex);
      // Allow small tolerance for numerical errors
      return angle >= Math.PI - 1e-10;
    } catch {
      // Vertex not in path or not interior
      return true;
    }
  }

  /**
   * Performs the FlipOut operation at a flexible joint.
   * Flips all edges in the wedge between incoming and outgoing path edges.
   *
   * @param vertex - The flexible joint vertex
   * @returns True if any edges were flipped
   */
  flipOut(vertex: Vertex): boolean {
    // Find which path contains this vertex
    const pathWithVertex = this.paths.find((p) => p.containsVertex(vertex));

    if (!pathWithVertex) {
      return false;
    }

    // Get incoming and outgoing edges at this vertex
    const pathEdges = this.getPathEdgesAtVertex(vertex, pathWithVertex);

    if (!pathEdges) {
      return false;
    }

    const { incomingEdge, outgoingEdge } = pathEdges;

    // Get all edges in the wedge between incoming and outgoing
    const wedgeEdges = this.getWedgeEdges(vertex, incomingEdge, outgoingEdge);

    this.log(`FlipOut at vertex ${vertex.id}: ${wedgeEdges.length} edges in wedge`);

    // Flip each edge in the wedge
    let flippedCount = 0;

    for (const edge of wedgeEdges) {
      // Don't flip path edges themselves
      if (edge.id === incomingEdge.id || edge.id === outgoingEdge.id) {
        continue;
      }

      // Check if edge can be flipped (is interior)
      const he = edge.halfedge;
      const heTwin = he.twin;

      if (!heTwin || !he.face || !heTwin.face) {
        continue; // Boundary edge
      }

      // Perform the flip
      this.triangulation.flipEdge(edge);

      // Update signpost data
      this.signpostData.updateAfterFlip(edge);

      flippedCount++;
    }

    this.log(`Flipped ${flippedCount} edges`);

    // Update path to reflect new edge connectivity
    // After flipping, the path may use different edges
    pathWithVertex.updateLength();

    return flippedCount > 0;
  }

  /**
   * Gets the incoming and outgoing path edges at a vertex.
   *
   * @param vertex - The vertex
   * @param path - The path containing the vertex
   * @returns Incoming and outgoing edges, or null if vertex not interior
   */
  private getPathEdgesAtVertex(
    vertex: Vertex,
    path: GeodesicPath
  ): { incomingEdge: Edge; outgoingEdge: Edge } | null {
    const index = path.getVertexIndex(vertex);

    if (index <= 0 || index >= path.edges.length) {
      return null; // Not an interior vertex
    }

    const incomingEdge = path.edges[index - 1];
    const outgoingEdge = path.edges[index];

    if (!incomingEdge || !outgoingEdge) {
      return null;
    }

    return {
      incomingEdge,
      outgoingEdge,
    };
  }

  /**
   * Gets all edges in the wedge between incoming and outgoing edges.
   * Uses signpost data to determine angular positions.
   *
   * @param vertex - The vertex
   * @param incomingEdge - Incoming path edge
   * @param outgoingEdge - Outgoing path edge
   * @returns Array of edges in the wedge
   */
  private getWedgeEdges(vertex: Vertex, incomingEdge: Edge, outgoingEdge: Edge): Edge[] {
    const wedgeEdges: Edge[] = [];

    // Get halfedges at this vertex for both edges
    const inHe = this.getHalfedgeAtVertex(incomingEdge, vertex);
    const outHe = this.getHalfedgeAtVertex(outgoingEdge, vertex);

    if (!inHe || !outHe) {
      return wedgeEdges;
    }

    // Get signpost angles
    const inAngle = this.signpostData.getAngle(inHe);
    const outAngle = this.signpostData.getAngle(outHe);

    // Get all outgoing halfedges
    const allHalfedges = this.signpostData.getOutgoingHalfedgesSorted(vertex);

    // Collect edges between inAngle and outAngle (counter-clockwise)
    for (const he of allHalfedges) {
      const heAngle = this.signpostData.getAngle(he);

      if (this.signpostData.isAngleBetween(heAngle, inAngle, outAngle)) {
        // Don't include the incoming/outgoing edges themselves
        if (he.edge.id !== incomingEdge.id && he.edge.id !== outgoingEdge.id) {
          wedgeEdges.push(he.edge);
        }
      }
    }

    return wedgeEdges;
  }

  /**
   * Gets the halfedge of an edge that originates from a vertex.
   *
   * @param edge - The edge
   * @param vertex - The vertex
   * @returns The halfedge, or null if not found
   */
  private getHalfedgeAtVertex(edge: Edge, vertex: Vertex): Halfedge | null {
    const he = edge.halfedge;
    const heTwin = he.twin;

    // Check which halfedge has this vertex as its source
    // In our halfedge structure, halfedge.vertex is the destination vertex
    // So we need the halfedge whose next.vertex is NOT this vertex (i.e., the one that starts from this vertex)

    // Actually, let's check: if he.next.vertex === vertex, then he starts elsewhere and points here
    // We want the one where we walk AWAY from vertex

    if (he.vertex.id === vertex.id) {
      // he ends at vertex, so twin starts from vertex
      return heTwin;
    }

    if (heTwin && heTwin.vertex.id === vertex.id) {
      // twin ends at vertex, so he starts from vertex
      return he;
    }

    return null;
  }

  /**
   * Iteratively shortens paths by flipping edges until they become geodesic.
   * This is the main FlipOut algorithm loop.
   *
   * @param maxIterations - Maximum iterations (default from options)
   * @param convergenceThreshold - Convergence threshold (default from options)
   * @returns Number of iterations performed
   */
  iterativeShorten(maxIterations?: number, convergenceThreshold?: number): number {
    const maxIter = maxIterations ?? this.options.maxIterations;
    const threshold = convergenceThreshold ?? this.options.convergenceThreshold;

    let iteration = 0;
    let prevLength = this.getLength();

    this.log(`Starting iterative shortening (max: ${maxIter}, threshold: ${threshold})`);
    this.log(`Initial length: ${prevLength}`);

    while (iteration < maxIter) {
      // Find a flexible joint
      const flexibleJoint = this.findFlexibleJoint();

      if (!flexibleJoint) {
        this.log(`No flexible joints found - path is geodesic!`);
        break;
      }

      this.log(`Iteration ${iteration}: Flexible joint at vertex ${flexibleJoint.id}`);

      // Perform FlipOut at this joint
      const flipped = this.flipOut(flexibleJoint);

      if (!flipped) {
        this.log(`Could not flip at vertex ${flexibleJoint.id}`);
        break;
      }

      iteration++;

      // Check convergence
      const currentLength = this.getLength();
      const lengthChange = Math.abs(currentLength - prevLength);

      this.log(`Length: ${currentLength} (change: ${lengthChange})`);

      if (lengthChange < threshold) {
        this.log(`Converged after ${iteration} iterations`);
        break;
      }

      prevLength = currentLength;
    }

    this.log(`Completed after ${iteration} iterations. Final length: ${this.getLength()}`);

    return iteration;
  }

  /**
   * Gets paths as arrays of surface points.
   * Each path is represented as a sequence of surface points.
   *
   * @returns Array of surface point arrays (one per path)
   */
  getPathPolyline(): SurfacePoint[][] {
    // TODO: Implement with TraceGeodesic for proper sampling
    // For now, return start and end points of each path
    return this.paths.map((path) => {
      const startPoint = SurfacePoint.fromVertex(
        path.startVertex,
        path.startVertex.halfedge!.face!
      );
      const endPoint = SurfacePoint.fromVertex(path.endVertex, path.endVertex.halfedge!.face!);
      return [startPoint, endPoint];
    });
  }

  /**
   * Gets paths as arrays of 3D coordinates for visualization.
   * Samples points along each path.
   *
   * @returns Array of 3D point arrays (one per path)
   */
  getPathPolyline3D(): Array<Array<{ x: number; y: number; z: number }>> {
    return this.paths.map((path) => {
      // Get all vertices along the path
      const vertices = path.getVertices();

      // Convert to 3D coordinates
      return vertices.map((v) => v.position);
    });
  }

  /**
   * Gets all edges in the triangulation as a polyline for debugging.
   * Useful for visualizing the entire mesh.
   *
   * @returns Array of 3D point arrays (one per edge)
   */
  getAllEdgePolyline3D(): Array<Array<{ x: number; y: number; z: number }>> {
    const edges = this.triangulation.getEdges();

    return edges.map((edge) => {
      const vertices = edge.getVertices();
      return [vertices[0]!.position, vertices[1]!.position];
    });
  }

  /**
   * Logs a message if verbose mode is enabled.
   */
  private log(message: string): void {
    if (this.options.verbose) {
      // eslint-disable-next-line no-undef, no-console
      console.log(`[FlipEdgeNetwork] ${message}`);
    }
  }
}
