import type { IntrinsicTriangulation } from '../core/IntrinsicTriangulation';
import type { Face } from '../core/Face';
import type { Edge } from '../core/Edge';
import type { FaceId, EdgeId } from '../types';
import type { GeodesicLoop } from './GeodesicLoop';

/**
 * Regions a face can belong to relative to the loop.
 */
export enum FaceRegion {
  /**
   * Face is inside the loop (on the left side of the loop direction).
   */
  INSIDE = 'inside',

  /**
   * Face is outside the loop (on the right side of the loop direction).
   */
  OUTSIDE = 'outside',

  /**
   * Face is adjacent to the loop boundary.
   */
  BOUNDARY = 'boundary',

  /**
   * Face region hasn't been determined yet.
   */
  UNKNOWN = 'unknown',
}

/**
 * Result of mesh segmentation.
 */
export interface SegmentationResult {
  /**
   * Faces inside the loop.
   */
  insideFaces: Face[];

  /**
   * Faces outside the loop.
   */
  outsideFaces: Face[];

  /**
   * Faces adjacent to the loop boundary.
   */
  boundaryFaces: Face[];

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
 * Segments a mesh based on a geodesic loop.
 *
 * The segmentation uses the loop's orientation to determine which faces
 * are "inside" (on the left side of the loop direction) and which are
 * "outside" (on the right side).
 *
 * Uses flood fill to propagate region assignments across non-loop edges.
 */
export class MeshSegmentation {
  private readonly triangulation: IntrinsicTriangulation;
  private readonly loop: GeodesicLoop;

  /**
   * Mapping from face ID to region.
   */
  private faceRegions: Map<FaceId, FaceRegion>;

  /**
   * Set of edge IDs that are part of the loop.
   */
  private loopEdgeIds: Set<EdgeId>;

  constructor(triangulation: IntrinsicTriangulation, loop: GeodesicLoop) {
    this.triangulation = triangulation;
    this.loop = loop;
    this.faceRegions = new Map();
    this.loopEdgeIds = new Set();

    // Build set of loop edge IDs
    for (const edge of loop.edges) {
      this.loopEdgeIds.add(edge.id);
    }
  }

  /**
   * Computes the mesh segmentation.
   *
   * @returns Segmentation result
   */
  compute(): SegmentationResult {
    // Step 1: Initialize all faces as UNKNOWN
    this.initializeFaces();

    // Step 2: Determine seed faces for inside/outside
    const { insideSeed, outsideSeed } = this.determineSeedFaces();

    // Step 3: Flood fill from seed faces
    if (insideSeed) {
      this.floodFill(insideSeed, FaceRegion.INSIDE);
    }
    if (outsideSeed) {
      this.floodFill(outsideSeed, FaceRegion.OUTSIDE);
    }

    // Step 4: Mark remaining faces based on adjacency
    this.markRemainingFaces();

    // Step 5: Collect results
    return this.collectResults();
  }

  /**
   * Gets the region of a specific face.
   *
   * @param face - The face to query
   * @returns The face's region
   */
  getRegion(face: Face): FaceRegion {
    return this.faceRegions.get(face.id) ?? FaceRegion.UNKNOWN;
  }

  /**
   * Gets all faces in a specific region.
   *
   * @param region - The region to query
   * @returns Array of faces in that region
   */
  getFaces(region: FaceRegion): Face[] {
    const faces: Face[] = [];

    for (const face of this.triangulation.getFaces()) {
      if (this.faceRegions.get(face.id) === region) {
        faces.push(face);
      }
    }

    return faces;
  }

  /**
   * Checks if an edge is part of the loop boundary.
   *
   * @param edge - The edge to check
   * @returns True if the edge is in the loop
   */
  isLoopEdge(edge: Edge): boolean {
    return this.loopEdgeIds.has(edge.id);
  }

  /**
   * Initializes all faces as UNKNOWN.
   */
  private initializeFaces(): void {
    for (const face of this.triangulation.getFaces()) {
      this.faceRegions.set(face.id, FaceRegion.UNKNOWN);
    }
  }

  /**
   * Determines seed faces for inside and outside regions.
   *
   * Uses the loop's first edge and its orientation to determine
   * which face is on the "inside" (left side of loop direction)
   * and which is on the "outside" (right side).
   */
  private determineSeedFaces(): { insideSeed: Face | null; outsideSeed: Face | null } {
    if (this.loop.edges.length === 0) {
      return { insideSeed: null, outsideSeed: null };
    }

    // Get the first edge and the vertex from which it departs
    const firstEdge = this.loop.edges[0]!;
    const baseVertex = this.loop.baseVertex;

    // Find the halfedge that points AWAY from baseVertex
    // This gives us the direction of the loop
    const he = firstEdge.halfedge;

    let loopHe = he;
    const heSource = he.getSourceVertex();
    if (heSource && heSource.id === baseVertex.id) {
      // he starts from baseVertex - this is our loop direction
      loopHe = he;
    } else if (he.twin) {
      // twin starts from baseVertex
      loopHe = he.twin;
    }

    // The face on the LEFT of the loop direction is "inside"
    // The face on the RIGHT is "outside"

    // In a standard halfedge representation:
    // - The face of a halfedge is on the LEFT of the halfedge direction
    // - The twin's face is on the RIGHT

    const insideFace = loopHe.face;
    const outsideFace = loopHe.twin?.face;

    return {
      insideSeed: insideFace ?? null,
      outsideSeed: outsideFace ?? null,
    };
  }

  /**
   * Flood fills from a seed face, assigning the given region.
   * Does not cross loop edges.
   */
  private floodFill(seedFace: Face, region: FaceRegion): void {
    const queue: Face[] = [seedFace];
    const visited = new Set<FaceId>();

    while (queue.length > 0) {
      const face = queue.shift()!;

      if (visited.has(face.id)) {
        continue;
      }

      // Skip if already assigned a different region
      const currentRegion = this.faceRegions.get(face.id);
      if (currentRegion !== FaceRegion.UNKNOWN && currentRegion !== region) {
        continue;
      }

      visited.add(face.id);
      this.faceRegions.set(face.id, region);

      // Get adjacent faces across non-loop edges
      const halfedges = face.getHalfedges();
      if (!halfedges) continue;

      for (const he of halfedges) {
        // Skip if this edge is part of the loop
        if (this.loopEdgeIds.has(he.edge.id)) {
          continue;
        }

        // Get the adjacent face
        const twin = he.twin;
        if (!twin || !twin.face) {
          continue; // Boundary edge
        }

        const neighborFace = twin.face;

        if (!visited.has(neighborFace.id)) {
          queue.push(neighborFace);
        }
      }
    }
  }

  /**
   * Marks remaining UNKNOWN faces based on their adjacency.
   * Faces adjacent to the loop get BOUNDARY, others are assigned
   * based on majority of neighbors.
   */
  private markRemainingFaces(): void {
    // First, mark boundary faces (faces touching loop edges)
    for (const face of this.triangulation.getFaces()) {
      if (this.faceRegions.get(face.id) !== FaceRegion.UNKNOWN) {
        continue;
      }

      const halfedges = face.getHalfedges();
      if (!halfedges) continue;

      // Check if any edge of this face is a loop edge
      for (const he of halfedges) {
        if (this.loopEdgeIds.has(he.edge.id)) {
          this.faceRegions.set(face.id, FaceRegion.BOUNDARY);
          break;
        }
      }
    }

    // For any remaining UNKNOWN faces, assign based on neighbors
    // (This handles disconnected components or edge cases)
    let changed = true;
    let iterations = 0;
    const maxIterations = 1000;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (const face of this.triangulation.getFaces()) {
        if (this.faceRegions.get(face.id) !== FaceRegion.UNKNOWN) {
          continue;
        }

        const halfedges = face.getHalfedges();
        if (!halfedges) continue;

        // Count neighbor regions
        let insideCount = 0;
        let outsideCount = 0;

        for (const he of halfedges) {
          const twin = he.twin;
          if (!twin || !twin.face) continue;

          const neighborRegion = this.faceRegions.get(twin.face.id);
          if (neighborRegion === FaceRegion.INSIDE) {
            insideCount++;
          } else if (neighborRegion === FaceRegion.OUTSIDE) {
            outsideCount++;
          }
        }

        // Assign based on majority
        if (insideCount > 0 || outsideCount > 0) {
          if (insideCount > outsideCount) {
            this.faceRegions.set(face.id, FaceRegion.INSIDE);
          } else if (outsideCount > insideCount) {
            this.faceRegions.set(face.id, FaceRegion.OUTSIDE);
          } else {
            // Tie - default to OUTSIDE
            this.faceRegions.set(face.id, FaceRegion.OUTSIDE);
          }
          changed = true;
        }
      }
    }

    // Any remaining UNKNOWN faces default to OUTSIDE
    for (const face of this.triangulation.getFaces()) {
      if (this.faceRegions.get(face.id) === FaceRegion.UNKNOWN) {
        this.faceRegions.set(face.id, FaceRegion.OUTSIDE);
      }
    }
  }

  /**
   * Collects and returns the segmentation results.
   */
  private collectResults(): SegmentationResult {
    const insideFaces: Face[] = [];
    const outsideFaces: Face[] = [];
    const boundaryFaces: Face[] = [];

    let insideArea = 0;
    let outsideArea = 0;
    let boundaryArea = 0;

    for (const face of this.triangulation.getFaces()) {
      const region = this.faceRegions.get(face.id);
      const area = face.getArea() ?? 0;

      switch (region) {
        case FaceRegion.INSIDE:
          insideFaces.push(face);
          insideArea += area;
          break;
        case FaceRegion.OUTSIDE:
          outsideFaces.push(face);
          outsideArea += area;
          break;
        case FaceRegion.BOUNDARY:
          boundaryFaces.push(face);
          boundaryArea += area;
          break;
      }
    }

    return {
      insideFaces,
      outsideFaces,
      boundaryFaces,
      insideArea,
      outsideArea,
      boundaryArea,
    };
  }

  /**
   * Gets the face region map for external access.
   */
  getFaceRegionMap(): Map<FaceId, FaceRegion> {
    return new Map(this.faceRegions);
  }
}
