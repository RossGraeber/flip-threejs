/**
 * flip-threejs - TypeScript implementation of the FlipOut geodesic algorithm
 * Based on "You Can Find Geodesic Paths in Triangle Meshes by Just Flipping Edges"
 * by Nicholas Sharp and Keenan Crane (SIGGRAPH Asia 2020)
 */

// Core types
export type { VertexId, EdgeId, HalfedgeId, FaceId } from './types';
export { createVertexId, createEdgeId, createHalfedgeId, createFaceId } from './types';

// Core mesh elements
export { Vertex } from './core/Vertex';
export { Edge, Halfedge } from './core/Edge';
export { Face } from './core/Face';
export { IntrinsicTriangulation } from './core/IntrinsicTriangulation';

// Geometry utilities
export { GeometricUtils } from './geometry/GeometricUtils';

// Version
export const VERSION = '0.1.1';
