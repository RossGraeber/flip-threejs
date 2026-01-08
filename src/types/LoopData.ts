import type { EdgeId, FaceId, VertexId } from './index';
import type { FlipEdgeNetworkOptions } from './PathData';

/**
 * Options for edge ordering optimization.
 */
export interface OrderingOptions {
  /**
   * Whether to use greedy nearest-neighbor heuristic.
   * @default true
   */
  useNearestNeighbor?: boolean;

  /**
   * Whether to apply 2-opt improvement after greedy ordering.
   * @default true
   */
  use2Opt?: boolean;

  /**
   * Maximum iterations for 2-opt improvement.
   * @default 100
   */
  max2OptIterations?: number;

  /**
   * Whether to skip edges that would cause self-crossing.
   * @default true
   */
  skipCrossingEdges?: boolean;
}

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
 * Result of edge ordering optimization.
 */
export interface OrderingResult {
  /**
   * Vertices in visiting order. First and last are the same (closed loop).
   */
  orderedWaypointIds: VertexId[];

  /**
   * Edge IDs that couldn't be incorporated without causing self-crossing.
   */
  skippedEdgeIds: EdgeId[];

  /**
   * Estimated total loop length based on Dijkstra distances.
   */
  estimatedLength: number;
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
   * Edge IDs that were skipped.
   */
  skippedEdgeIds: EdgeId[];

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
 * Segmentation result data for export.
 */
export interface SegmentationData {
  /**
   * Face IDs inside the loop.
   */
  insideFaceIds: FaceId[];

  /**
   * Face IDs outside the loop.
   */
  outsideFaceIds: FaceId[];

  /**
   * Face IDs adjacent to the loop boundary.
   */
  boundaryFaceIds: FaceId[];

  /**
   * Total area inside the loop.
   */
  insideArea: number;

  /**
   * Total area outside the loop.
   */
  outsideArea: number;

  /**
   * Total area of boundary faces.
   */
  boundaryArea: number;
}

/**
 * Export format for geodesic loops.
 */
export interface LoopExportData {
  /**
   * Edge IDs forming the loop.
   */
  loopEdgeIds: EdgeId[];

  /**
   * Base vertex ID where the loop closes.
   */
  baseVertexId: VertexId;

  /**
   * Input edge IDs that were used as waypoints.
   */
  inputEdgeIds: EdgeId[];

  /**
   * Edge IDs that were skipped.
   */
  skippedEdgeIds: EdgeId[];

  /**
   * 3D polyline points for visualization.
   */
  polyline: Array<{ x: number; y: number; z: number }>;

  /**
   * Segmentation data.
   */
  segmentation: SegmentationData;

  /**
   * Algorithm statistics.
   */
  stats: LoopStats;

  /**
   * Options used during creation.
   */
  options?: GeodesicLoopOptions;
}
