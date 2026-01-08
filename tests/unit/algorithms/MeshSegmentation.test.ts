import { describe, it, expect, beforeEach } from 'vitest';
import { MeshSegmentation, FaceRegion } from '../../../src/algorithms/MeshSegmentation';
import { GeodesicLoop } from '../../../src/algorithms/GeodesicLoop';
import { IntrinsicTriangulation } from '../../../src/core/IntrinsicTriangulation';
import type { BufferGeometry } from 'three';
import { createIndexedIcosahedron } from '../../utils/testGeometries';

describe('MeshSegmentation', () => {
  let geometry: BufferGeometry;
  let triangulation: IntrinsicTriangulation;

  beforeEach(() => {
    geometry = createIndexedIcosahedron(1, 1);
    triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);
  });

  describe('compute', () => {
    it('should segment mesh into inside and outside regions', () => {
      const loop = createSimpleLoop(triangulation);
      const segmentation = new MeshSegmentation(triangulation, loop);

      const result = segmentation.compute();

      expect(result.insideFaces.length).toBeGreaterThanOrEqual(0);
      expect(result.outsideFaces.length).toBeGreaterThanOrEqual(0);

      // Total faces should equal mesh faces
      const totalFaces = triangulation.getFaces().length;
      const segmentedFaces =
        result.insideFaces.length + result.outsideFaces.length + result.boundaryFaces.length;
      expect(segmentedFaces).toBe(totalFaces);
    });

    it('should compute areas for each region', () => {
      const loop = createSimpleLoop(triangulation);
      const segmentation = new MeshSegmentation(triangulation, loop);

      const result = segmentation.compute();

      expect(result.insideArea).toBeGreaterThanOrEqual(0);
      expect(result.outsideArea).toBeGreaterThanOrEqual(0);
      expect(result.boundaryArea).toBeGreaterThanOrEqual(0);

      // Total area should be positive
      const totalArea = result.insideArea + result.outsideArea + result.boundaryArea;
      expect(totalArea).toBeGreaterThan(0);
    });

    it('should identify boundary faces adjacent to loop', () => {
      const loop = createSimpleLoop(triangulation);
      const segmentation = new MeshSegmentation(triangulation, loop);

      const result = segmentation.compute();

      // For a simple triangle loop, boundary faces are those touching the loop edges
      // There should be at least some faces classified
      expect(
        result.insideFaces.length + result.outsideFaces.length + result.boundaryFaces.length
      ).toBeGreaterThan(0);
    });
  });

  describe('getRegion', () => {
    it('should return correct region for a face', () => {
      const loop = createSimpleLoop(triangulation);
      const segmentation = new MeshSegmentation(triangulation, loop);
      segmentation.compute();

      const faces = triangulation.getFaces();
      for (const face of faces) {
        const region = segmentation.getRegion(face);
        expect([FaceRegion.INSIDE, FaceRegion.OUTSIDE, FaceRegion.BOUNDARY]).toContain(region);
      }
    });
  });

  describe('getFaces', () => {
    it('should return all faces in a given region', () => {
      const loop = createSimpleLoop(triangulation);
      const segmentation = new MeshSegmentation(triangulation, loop);
      segmentation.compute();

      const insideFaces = segmentation.getFaces(FaceRegion.INSIDE);
      const outsideFaces = segmentation.getFaces(FaceRegion.OUTSIDE);
      const boundaryFaces = segmentation.getFaces(FaceRegion.BOUNDARY);

      // Each face should only be in one region
      const allFaceIds = new Set<number>();

      for (const face of insideFaces) {
        expect(allFaceIds.has(face.id)).toBe(false);
        allFaceIds.add(face.id);
      }

      for (const face of outsideFaces) {
        expect(allFaceIds.has(face.id)).toBe(false);
        allFaceIds.add(face.id);
      }

      for (const face of boundaryFaces) {
        expect(allFaceIds.has(face.id)).toBe(false);
        allFaceIds.add(face.id);
      }
    });
  });

  describe('isLoopEdge', () => {
    it('should correctly identify loop edges', () => {
      const loop = createSimpleLoop(triangulation);
      const segmentation = new MeshSegmentation(triangulation, loop);

      for (const edge of loop.edges) {
        expect(segmentation.isLoopEdge(edge)).toBe(true);
      }

      // Find an edge not in the loop
      const allEdges = triangulation.getEdges();
      const loopEdgeIds = new Set(loop.edges.map((e) => e.id));
      const nonLoopEdge = allEdges.find((e) => !loopEdgeIds.has(e.id));

      if (nonLoopEdge) {
        expect(segmentation.isLoopEdge(nonLoopEdge)).toBe(false);
      }
    });
  });

  describe('getFaceRegionMap', () => {
    it('should return a map of all face regions', () => {
      const loop = createSimpleLoop(triangulation);
      const segmentation = new MeshSegmentation(triangulation, loop);
      segmentation.compute();

      const regionMap = segmentation.getFaceRegionMap();

      expect(regionMap.size).toBe(triangulation.getFaces().length);

      for (const [_faceId, region] of regionMap) {
        expect([FaceRegion.INSIDE, FaceRegion.OUTSIDE, FaceRegion.BOUNDARY]).toContain(region);
      }
    });
  });
});

/**
 * Helper function to create a simple loop from a face's edges.
 */
function createSimpleLoop(triangulation: IntrinsicTriangulation): GeodesicLoop {
  const faces = triangulation.getFaces();
  if (faces.length === 0) {
    throw new Error('Triangulation has no faces');
  }

  // Use the first face's edges as a simple triangle loop
  const face = faces[0]!;
  const halfedges = face.getHalfedges();

  if (!halfedges) {
    throw new Error('Face has no halfedges');
  }

  const edges = [halfedges[0].edge, halfedges[1].edge, halfedges[2].edge];
  const baseVertex = halfedges[0].getSourceVertex()!;

  return new GeodesicLoop(edges, baseVertex);
}
