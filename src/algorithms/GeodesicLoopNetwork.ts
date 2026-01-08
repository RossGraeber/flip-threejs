import type { BufferGeometry } from 'three';
import type { Vertex } from '../core/Vertex';
import type { Edge, Halfedge } from '../core/Edge';
import type { EdgeId } from '../types';
import type { FlipEdgeNetworkOptions } from '../types/PathData';
import type { OrderingOptions, OrderingResult } from './EdgeOrderingOptimizer';
import type { SegmentationResult } from './MeshSegmentation';
import { IntrinsicTriangulation } from '../core/IntrinsicTriangulation';
import { SignpostData } from './SignpostData';
import { DijkstraShortestPath } from './DijkstraShortestPath';
import { EdgeOrderingOptimizer } from './EdgeOrderingOptimizer';
import { GeodesicLoop } from './GeodesicLoop';
import { MeshSegmentation } from './MeshSegmentation';

/**
 * Options for GeodesicLoopNetwork.
 */
export interface GeodesicLoopOptions extends FlipEdgeNetworkOptions {
  /**
   * Whether to optimize the order of visiting input edges.
   * @default true
   */
  optimizeOrder?: boolean;

  /**
   * Options for edge ordering optimization.
   */
  orderingOptions?: OrderingOptions;

  /**
   * Whether to fail if not all edges can be visited without crossing.
   * @default false
   */
  requireAllEdges?: boolean;

  /**
   * Maximum number of edges that can be skipped.
   * @default Infinity
   */
  maxSkippedEdges?: number;
}

/**
 * Statistics about loop computation.
 */
export interface LoopStats {
  /**
   * Number of input edges.
   */
  inputEdgeCount: number;

  /**
   * Number of edges actually visited by the loop.
   */
  visitedEdgeCount: number;

  /**
   * Edges that were skipped.
   */
  skippedEdges: Edge[];

  /**
   * Time spent on ordering optimization (ms).
   */
  orderingTime: number;

  /**
   * Number of FlipOut iterations.
   */
  iterations: number;

  /**
   * Initial loop length.
   */
  initialLength: number;

  /**
   * Final loop length.
   */
  finalLength: number;

  /**
   * Total execution time (ms).
   */
  executionTime: number;

  /**
   * Whether the algorithm converged.
   */
  converged: boolean;
}

/**
 * Result of loop computation.
 */
export interface LoopComputationResult {
  /**
   * The computed geodesic loop.
   */
  loop: GeodesicLoop;

  /**
   * Mesh segmentation based on the loop.
   */
  segmentation: SegmentationResult;

  /**
   * Statistics about the computation.
   */
  stats: LoopStats;
}

/**
 * Main class for computing geodesic loops using the FlipOut algorithm.
 *
 * Given a set of input edges as waypoints, this class:
 * 1. Optimizes the order of visiting the edges
 * 2. Builds an initial loop using Dijkstra paths
 * 3. Shortens the loop using the FlipOut algorithm
 * 4. Segments the mesh based on the loop
 */
export class GeodesicLoopNetwork {
  /**
   * The intrinsic triangulation.
   */
  readonly triangulation: IntrinsicTriangulation;

  /**
   * Signpost data for intrinsic geometry.
   */
  readonly signpostData: SignpostData;

  /**
   * The geodesic loop (null until computed).
   */
  loop: GeodesicLoop | null = null;

  /**
   * Mesh segmentation (null until computed).
   */
  private segmentation: MeshSegmentation | null = null;

  /**
   * Input edges to use as waypoints.
   */
  private readonly inputEdges: Edge[];

  /**
   * Configuration options.
   */
  private readonly options: Required<GeodesicLoopOptions>;

  /**
   * Default options.
   */
  private static readonly DEFAULT_OPTIONS: Required<GeodesicLoopOptions> = {
    maxIterations: 10000,
    convergenceThreshold: 1e-10,
    bezierSubdivisionRounds: 0,
    enableDelaunayRefine: false,
    delaunayAngleThreshold: 0.1,
    delaunayMaxInsertions: 1000,
    delaunayMaxRounds: 25,
    polylineStepSize: 0.1,
    verbose: false,
    optimizeOrder: true,
    orderingOptions: {},
    requireAllEdges: false,
    maxSkippedEdges: Infinity,
  };

  /**
   * Creates a new GeodesicLoopNetwork.
   *
   * @param triangulation - The intrinsic triangulation
   * @param inputEdges - Edges to use as waypoints
   * @param options - Configuration options
   */
  constructor(
    triangulation: IntrinsicTriangulation,
    inputEdges: Edge[],
    options: GeodesicLoopOptions = {}
  ) {
    this.triangulation = triangulation;
    this.signpostData = new SignpostData(triangulation);
    this.inputEdges = inputEdges;
    this.options = { ...GeodesicLoopNetwork.DEFAULT_OPTIONS, ...options };
  }

  /**
   * Creates a GeodesicLoopNetwork from a Three.js BufferGeometry and edge indices.
   *
   * @param geometry - The mesh geometry
   * @param edgeIndices - Indices of edges to use as waypoints
   * @param options - Configuration options
   * @returns New GeodesicLoopNetwork
   */
  static fromEdgeWaypoints(
    geometry: BufferGeometry,
    edgeIndices: number[],
    options: GeodesicLoopOptions = {}
  ): GeodesicLoopNetwork {
    const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);
    const allEdges = triangulation.getEdges();

    // Get edges by index
    const inputEdges: Edge[] = [];
    for (const idx of edgeIndices) {
      if (idx >= 0 && idx < allEdges.length) {
        inputEdges.push(allEdges[idx]!);
      }
    }

    return new GeodesicLoopNetwork(triangulation, inputEdges, options);
  }

  /**
   * Creates a GeodesicLoopNetwork from edge IDs.
   *
   * @param geometry - The mesh geometry
   * @param edgeIds - IDs of edges to use as waypoints
   * @param options - Configuration options
   * @returns New GeodesicLoopNetwork
   */
  static fromEdgeIds(
    geometry: BufferGeometry,
    edgeIds: EdgeId[],
    options: GeodesicLoopOptions = {}
  ): GeodesicLoopNetwork {
    const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

    // Get edges by ID
    const inputEdges: Edge[] = [];
    for (const id of edgeIds) {
      const edge = triangulation.edges.get(id);
      if (edge) {
        inputEdges.push(edge);
      }
    }

    return new GeodesicLoopNetwork(triangulation, inputEdges, options);
  }

  /**
   * Creates a GeodesicLoopNetwork directly from Edge objects.
   *
   * @param triangulation - The intrinsic triangulation
   * @param edges - Edges to use as waypoints
   * @param options - Configuration options
   * @returns New GeodesicLoopNetwork
   */
  static fromEdges(
    triangulation: IntrinsicTriangulation,
    edges: Edge[],
    options: GeodesicLoopOptions = {}
  ): GeodesicLoopNetwork {
    return new GeodesicLoopNetwork(triangulation, edges, options);
  }

  /**
   * Computes the geodesic loop.
   *
   * @returns Loop computation result
   */
  compute(): LoopComputationResult {
    const startTime = Date.now();
    let orderingTime = 0;

    this.log(`Starting loop computation with ${this.inputEdges.length} input edges`);

    // Step 1: Optimize edge ordering
    let orderingResult: OrderingResult;
    if (this.options.optimizeOrder) {
      const orderingStart = Date.now();
      const optimizer = new EdgeOrderingOptimizer(this.triangulation);
      orderingResult = optimizer.optimizeOrder(this.inputEdges, this.options.orderingOptions);
      orderingTime = Date.now() - orderingStart;
      this.log(`Ordering optimized in ${orderingTime.toFixed(2)}ms`);
    } else {
      // Use input order
      orderingResult = this.sequentialOrdering();
    }

    this.log(`Waypoints: ${orderingResult.orderedWaypoints.length}`);
    this.log(`Skipped edges: ${orderingResult.skippedEdges.length}`);

    // Check if too many edges were skipped
    if (orderingResult.skippedEdges.length > this.options.maxSkippedEdges) {
      throw new Error(
        `Too many edges skipped: ${orderingResult.skippedEdges.length} > ${this.options.maxSkippedEdges}`
      );
    }

    if (this.options.requireAllEdges && orderingResult.skippedEdges.length > 0) {
      throw new Error(
        `Cannot visit all edges without self-crossing. Skipped: ${orderingResult.skippedEdges.length}`
      );
    }

    // Step 2: Build initial loop
    this.log('Building initial loop from Dijkstra paths');
    this.loop = this.buildInitialLoop(orderingResult.orderedWaypoints);
    const initialLength = this.loop.length;
    this.log(`Initial loop length: ${initialLength}`);

    // Step 3: Iteratively shorten using FlipOut
    this.log('Starting iterative shortening');
    const { iterations, converged } = this.iterativeShortenLoop();
    const finalLength = this.loop.length;
    this.log(`Final loop length: ${finalLength}`);

    // Step 4: Compute segmentation
    this.log('Computing mesh segmentation');
    this.segmentation = new MeshSegmentation(this.triangulation, this.loop);
    const segmentationResult = this.segmentation.compute();
    this.log(
      `Segmentation: ${segmentationResult.insideFaces.length} inside, ${segmentationResult.outsideFaces.length} outside`
    );

    const executionTime = Date.now() - startTime;

    const stats: LoopStats = {
      inputEdgeCount: this.inputEdges.length,
      visitedEdgeCount: this.inputEdges.length - orderingResult.skippedEdges.length,
      skippedEdges: orderingResult.skippedEdges,
      orderingTime,
      iterations,
      initialLength,
      finalLength,
      executionTime,
      converged,
    };

    return {
      loop: this.loop,
      segmentation: segmentationResult,
      stats,
    };
  }

  /**
   * Sequential ordering (visits edges in input order).
   */
  private sequentialOrdering(): OrderingResult {
    const waypoints: Vertex[] = [];

    if (this.inputEdges.length === 0) {
      return {
        orderedWaypoints: [],
        skippedEdges: [],
        estimatedLength: 0,
      };
    }

    // Start with first vertex of first edge
    let currentVertex = this.inputEdges[0]!.getVertices()[0]!;
    waypoints.push(currentVertex);

    for (const edge of this.inputEdges) {
      const [v0, v1] = edge.getVertices();
      if (!v0 || !v1) continue;

      // Pick the vertex of this edge that's not current
      // to ensure we traverse the edge
      if (v0.id === currentVertex.id) {
        waypoints.push(v1);
        currentVertex = v1;
      } else {
        waypoints.push(v0);
        waypoints.push(v1);
        currentVertex = v1;
      }
    }

    // Close the loop
    if (waypoints.length > 0) {
      waypoints.push(waypoints[0]!);
    }

    return {
      orderedWaypoints: waypoints,
      skippedEdges: [],
      estimatedLength: 0,
    };
  }

  /**
   * Builds the initial loop from ordered waypoints using Dijkstra paths.
   *
   * @param waypoints - Ordered vertices to visit (first = last)
   * @returns Initial GeodesicLoop
   */
  private buildInitialLoop(waypoints: Vertex[]): GeodesicLoop {
    if (waypoints.length < 3) {
      throw new Error('Need at least 3 waypoints to form a loop');
    }

    const dijkstra = new DijkstraShortestPath(this.triangulation);
    const allEdges: Edge[] = [];

    // Compute Dijkstra paths between consecutive waypoints
    for (let i = 0; i < waypoints.length - 1; i++) {
      const source = waypoints[i]!;
      const target = waypoints[i + 1]!;

      if (source.id === target.id) {
        continue; // Skip if same vertex
      }

      const path = dijkstra.computePath(source.id, target.id);
      if (!path) {
        throw new Error(`No path from vertex ${source.id} to ${target.id}`);
      }

      // Add path edges to the loop
      allEdges.push(...path.edges);
    }

    if (allEdges.length < 3) {
      throw new Error('Loop must have at least 3 edges');
    }

    // Base vertex is the first waypoint
    const baseVertex = waypoints[0]!;

    return new GeodesicLoop(allEdges, baseVertex);
  }

  /**
   * Iteratively shortens the loop using the FlipOut algorithm.
   * Handles the loop-specific case where the base vertex is also interior.
   */
  private iterativeShortenLoop(): { iterations: number; converged: boolean } {
    if (!this.loop) {
      throw new Error('Loop not initialized');
    }

    let iteration = 0;
    let prevLength = this.loop.length;
    let converged = false;

    while (iteration < this.options.maxIterations) {
      // Find a flexible joint
      const flexibleJoint = this.findFlexibleJoint();

      if (!flexibleJoint) {
        this.log('No flexible joints found - loop is geodesic!');
        converged = true;
        break;
      }

      this.log(`Iteration ${iteration}: Flexible joint at vertex ${flexibleJoint.id}`);

      // Perform FlipOut at this joint
      const flipped = this.flipOutLoop(flexibleJoint);

      if (!flipped) {
        this.log(`Could not flip at vertex ${flexibleJoint.id}`);
        break;
      }

      iteration++;

      // Check convergence
      const currentLength = this.loop.length;
      const lengthChange = Math.abs(currentLength - prevLength);

      this.log(`Length: ${currentLength.toFixed(6)} (change: ${lengthChange.toFixed(10)})`);

      if (lengthChange < this.options.convergenceThreshold) {
        this.log(`Converged after ${iteration} iterations`);
        converged = true;
        break;
      }

      prevLength = currentLength;
    }

    return { iterations: iteration, converged };
  }

  /**
   * Finds a flexible joint in the loop.
   * For loops, ALL vertices (including baseVertex) are interior.
   */
  private findFlexibleJoint(): Vertex | null {
    if (!this.loop) return null;

    const vertices = this.loop.getInteriorVertices();

    for (const vertex of vertices) {
      try {
        const angle = this.loop.getAngleAtVertex(vertex, this.signpostData);

        // A flexible joint has angle < π
        if (angle < Math.PI - 1e-10) {
          return vertex;
        }
      } catch {
        // Skip if angle computation fails
        continue;
      }
    }

    return null;
  }

  /**
   * Performs FlipOut at a vertex in the loop.
   */
  private flipOutLoop(vertex: Vertex): boolean {
    if (!this.loop) return false;

    const edgesAtVertex = this.loop.getEdgesAtVertex(vertex);
    if (!edgesAtVertex) return false;

    const { incoming: incomingEdge, outgoing: outgoingEdge } = edgesAtVertex;

    // Get wedge edges
    const wedgeEdges = this.getWedgeEdges(vertex, incomingEdge, outgoingEdge);

    this.log(`FlipOut at vertex ${vertex.id}: ${wedgeEdges.length} edges in wedge`);

    let flippedCount = 0;

    for (const edge of wedgeEdges) {
      // Don't flip path edges
      if (edge.id === incomingEdge.id || edge.id === outgoingEdge.id) {
        continue;
      }

      // Check if edge can be flipped
      if (edge.isBoundary()) {
        continue;
      }

      // Perform the flip
      this.triangulation.flipEdge(edge);

      // Update signpost data
      this.signpostData.updateAfterFlip(edge);

      flippedCount++;
    }

    this.log(`Flipped ${flippedCount} edges`);

    // Update loop length
    this.loop.updateLength();

    return flippedCount > 0;
  }

  /**
   * Gets edges in the wedge between incoming and outgoing edges at a vertex.
   */
  private getWedgeEdges(vertex: Vertex, incomingEdge: Edge, outgoingEdge: Edge): Edge[] {
    const wedgeEdges: Edge[] = [];

    // Get halfedges pointing TO this vertex (for incoming) and FROM this vertex (for outgoing)
    const inHe = this.getOutgoingHalfedgeFromIncoming(incomingEdge, vertex);
    const outHe = this.getOutgoingHalfedgeForOutgoing(outgoingEdge, vertex);

    if (!inHe || !outHe) {
      return wedgeEdges;
    }

    // Get signpost angles
    const inAngle = this.signpostData.getAngle(inHe);
    const outAngle = this.signpostData.getAngle(outHe);

    // Get all outgoing halfedges sorted by angle
    const allHalfedges = this.signpostData.getOutgoingHalfedgesSorted(vertex);

    // Collect edges in the wedge
    for (const he of allHalfedges) {
      const heAngle = this.signpostData.getAngle(he);

      if (this.signpostData.isAngleBetween(heAngle, inAngle, outAngle)) {
        if (he.edge.id !== incomingEdge.id && he.edge.id !== outgoingEdge.id) {
          wedgeEdges.push(he.edge);
        }
      }
    }

    return wedgeEdges;
  }

  /**
   * Gets the outgoing halfedge at vertex for the incoming edge direction.
   * The incoming edge points TO this vertex, so we need the twin's direction.
   */
  private getOutgoingHalfedgeFromIncoming(edge: Edge, vertex: Vertex): Halfedge | null {
    const he = edge.halfedge;

    // Find halfedge pointing TO vertex
    if (he.vertex.id === vertex.id) {
      // he points to vertex, so he.twin points away from vertex
      return he.twin;
    }
    if (he.twin && he.twin.vertex.id === vertex.id) {
      // twin points to vertex, so he points away from vertex
      return he;
    }

    return null;
  }

  /**
   * Gets the outgoing halfedge at vertex for the outgoing edge direction.
   */
  private getOutgoingHalfedgeForOutgoing(edge: Edge, vertex: Vertex): Halfedge | null {
    const he = edge.halfedge;

    // Find halfedge pointing FROM vertex (source = vertex)
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
   * Gets the total length of the loop.
   */
  getLength(): number {
    return this.loop?.length ?? 0;
  }

  /**
   * Gets the loop as a 3D polyline for visualization.
   */
  getLoopPolyline3D(): Array<{ x: number; y: number; z: number }> {
    if (!this.loop) return [];

    const vertices = this.loop.getVertices();
    const points = vertices.map((v) => v.position);

    // Close the loop by adding the first vertex at the end
    if (points.length > 0) {
      points.push(points[0]!);
    }

    return points;
  }

  /**
   * Gets the mesh segmentation.
   */
  getSegmentation(): MeshSegmentation | null {
    return this.segmentation;
  }

  /**
   * Logs a message if verbose mode is enabled.
   */
  private log(message: string): void {
    if (this.options.verbose) {
      // eslint-disable-next-line no-undef, no-console
      console.log(`[GeodesicLoopNetwork] ${message}`);
    }
  }
}
