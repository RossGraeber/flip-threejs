/**
 * Branded type for vertex identifiers to prevent mixing with other numeric IDs.
 */
export type VertexId = number & { readonly __brand: 'VertexId' };

/**
 * Branded type for edge identifiers to prevent mixing with other numeric IDs.
 */
export type EdgeId = number & { readonly __brand: 'EdgeId' };

/**
 * Branded type for halfedge identifiers to prevent mixing with other numeric IDs.
 */
export type HalfedgeId = number & { readonly __brand: 'HalfedgeId' };

/**
 * Branded type for face identifiers to prevent mixing with other numeric IDs.
 */
export type FaceId = number & { readonly __brand: 'FaceId' };

/**
 * Type guard to create a VertexId from a number.
 */
export function createVertexId(id: number): VertexId {
  return id as VertexId;
}

/**
 * Type guard to create an EdgeId from a number.
 */
export function createEdgeId(id: number): EdgeId {
  return id as EdgeId;
}

/**
 * Type guard to create a HalfedgeId from a number.
 */
export function createHalfedgeId(id: number): HalfedgeId {
  return id as HalfedgeId;
}

/**
 * Type guard to create a FaceId from a number.
 */
export function createFaceId(id: number): FaceId {
  return id as FaceId;
}
