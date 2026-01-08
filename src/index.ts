/**
 * flip-threejs - TypeScript implementation of the FlipOut geodesic algorithm
 * Based on "You Can Find Geodesic Paths in Triangle Meshes by Just Flipping Edges"
 * by Nicholas Sharp and Keenan Crane (SIGGRAPH Asia 2020)
 */

// Core types
export type { VertexId, EdgeId, HalfedgeId, FaceId } from './types';
export { createVertexId, createEdgeId, createHalfedgeId, createFaceId } from './types';

// Path types
export type {
  FlipEdgeNetworkOptions,
  DijkstraResult,
  FlipOutStats,
  PathExportData,
  PathExportDataFull,
} from './types';

// Loop types
export type {
  GeodesicLoopOptions,
  OrderingOptions,
  OrderingResult,
  LoopStats,
  SegmentationData,
  LoopExportData,
} from './types/LoopData';

// Core mesh elements
export { Vertex } from './core/Vertex';
export { Edge, Halfedge } from './core/Edge';
export { Face } from './core/Face';
export { IntrinsicTriangulation } from './core/IntrinsicTriangulation';

// Geometry utilities
export { GeometricUtils } from './geometry/GeometricUtils';
export { SurfacePoint } from './geometry/SurfacePoint';
export { TraceGeodesic } from './geometry/TraceGeodesic';
export { PathExport } from './geometry/PathExport';

// Algorithm classes
export { FlipEdgeNetwork } from './algorithms/FlipEdgeNetwork';
export { GeodesicPath } from './algorithms/GeodesicPath';
export { DijkstraShortestPath } from './algorithms/DijkstraShortestPath';
export { SignpostData } from './algorithms/SignpostData';
export { BezierSubdivision } from './algorithms/BezierSubdivision';

// Geodesic loop classes
export { GeodesicLoop } from './algorithms/GeodesicLoop';
export { GeodesicLoopNetwork } from './algorithms/GeodesicLoopNetwork';
export { EdgeOrderingOptimizer } from './algorithms/EdgeOrderingOptimizer';
export { MeshSegmentation, FaceRegion } from './algorithms/MeshSegmentation';
export type { SegmentationResult } from './algorithms/MeshSegmentation';
export type { LoopComputationResult } from './algorithms/GeodesicLoopNetwork';

// Version
export const VERSION = '0.2.2';
