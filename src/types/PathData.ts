/**
 * Configuration options for FlipEdgeNetwork.
 */
export interface FlipEdgeNetworkOptions {
  /**
   * Maximum number of iterations for the iterative shortening algorithm.
   * @default 10000
   */
  maxIterations?: number;

  /**
   * Convergence threshold for path length change.
   * Algorithm stops when length change is below this threshold.
   * @default 1e-10
   */
  convergenceThreshold?: number;

  /**
   * Number of Bezier subdivision rounds to perform.
   * Each round splits segments at their midpoints and re-straightens.
   * @default 0 (no subdivision)
   */
  bezierSubdivisionRounds?: number;

  /**
   * Whether to enable Delaunay refinement of the triangulation.
   * @default false
   */
  enableDelaunayRefine?: boolean;

  /**
   * Minimum angle threshold for Delaunay refinement (in radians).
   * Triangles with angles below this may have Steiner points inserted.
   * @default 0.1
   */
  delaunayAngleThreshold?: number;

  /**
   * Maximum number of Steiner point insertions during Delaunay refinement.
   * @default 1000
   */
  delaunayMaxInsertions?: number;

  /**
   * Maximum number of refinement rounds.
   * @default 25
   */
  delaunayMaxRounds?: number;

  /**
   * Step size for polyline generation (as fraction of edge length).
   * Smaller values create smoother polylines but more points.
   * @default Auto-calculated based on mesh
   */
  polylineStepSize?: number;

  /**
   * Enable verbose logging of algorithm progress.
   * @default false
   */
  verbose?: boolean;
}

/**
 * Result of Dijkstra shortest path computation.
 */
export interface DijkstraResult {
  /**
   * Distance from source to each vertex.
   */
  distances: Map<number, number>;

  /**
   * Parent vertex in shortest path tree.
   * null for source vertices.
   */
  parents: Map<number, number | null>;

  /**
   * Whether the target was reached.
   */
  targetReached: boolean;
}

/**
 * Statistics about FlipOut algorithm execution.
 */
export interface FlipOutStats {
  /**
   * Number of iterations performed.
   */
  iterations: number;

  /**
   * Initial path length before shortening.
   */
  initialLength: number;

  /**
   * Final path length after shortening.
   */
  finalLength: number;

  /**
   * Number of edge flips performed.
   */
  flipsPerformed: number;

  /**
   * Execution time in milliseconds.
   */
  executionTime: number;

  /**
   * Whether the algorithm converged.
   */
  converged: boolean;
}

/**
 * Export format for geodesic paths.
 */
export interface PathExportData {
  /**
   * Paths as sequences of vertex IDs.
   */
  paths: number[][];

  /**
   * Path lengths.
   */
  lengths: number[];

  /**
   * Marked vertices (Bezier control points).
   */
  markedVertices: number[];

  /**
   * 3D polyline points for each path.
   */
  polylines: Array<Array<{ x: number; y: number; z: number }>>;

  /**
   * Algorithm statistics.
   */
  stats?: FlipOutStats;
}

/**
 * Extended export format that includes data needed for full reconstruction.
 */
export interface PathExportDataFull extends PathExportData {
  /**
   * Waypoint vertex IDs for each path (start and end vertices).
   * Used to reconstruct paths via Dijkstra.
   */
  waypoints: number[][];

  /**
   * Options used during creation (optional).
   */
  options?: FlipEdgeNetworkOptions;
}
