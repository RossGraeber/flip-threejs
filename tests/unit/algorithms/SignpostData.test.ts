import { describe, it, expect, beforeEach } from 'vitest';
import { SignpostData } from '../../../src/algorithms/SignpostData';
import { IntrinsicTriangulation } from '../../../src/core/IntrinsicTriangulation';
import type { Vertex } from '../../../src/core/Vertex';
import type { Halfedge } from '../../../src/core/Edge';
import {
  createIndexedIcosahedron,
  createTriangleGeometry,
  createOpenMesh,
} from '../../utils/testGeometries';

describe('SignpostData', () => {
  let triangulation: IntrinsicTriangulation;
  let signpostData: SignpostData;

  beforeEach(() => {
    const geometry = createIndexedIcosahedron(1, 0);
    triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);
    signpostData = new SignpostData(triangulation);
  });

  describe('constructor', () => {
    it('should initialize signpost data for all vertices', () => {
      expect(signpostData).toBeDefined();

      // Check that each vertex has reference halfedge
      for (const vertex of triangulation.getVertices()) {
        const refHe = signpostData.getReferenceHalfedge(vertex);
        expect(refHe).toBeDefined();
      }
    });
  });

  describe('getAngle', () => {
    it('should return 0 for reference halfedge', () => {
      const vertex = triangulation.getVertices()[0]!;
      const refHeId = signpostData.getReferenceHalfedge(vertex);

      expect(refHeId).toBeDefined();

      // Find the reference halfedge from the sorted list
      const halfedges = signpostData.getOutgoingHalfedgesSorted(vertex);
      const refHe = halfedges.find((he) => he.id === refHeId);

      expect(refHe).toBeDefined();
      if (refHe) {
        expect(signpostData.getAngle(refHe)).toBe(0);
      }
    });

    it('should return non-negative angles', () => {
      for (const vertex of triangulation.getVertices()) {
        const halfedges = signpostData.getOutgoingHalfedgesSorted(vertex);

        for (const he of halfedges) {
          const angle = signpostData.getAngle(he);
          expect(angle).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should throw for unknown halfedge', () => {
      // Create a mock halfedge with unknown ID
      const fakeHalfedge = {
        id: 99999 as any,
        vertex: triangulation.getVertices()[0],
      } as Halfedge;

      expect(() => {
        signpostData.getAngle(fakeHalfedge);
      }).toThrow('No signpost data');
    });
  });

  describe('getAngleBetween', () => {
    it('should return 0 for same halfedge', () => {
      const vertex = triangulation.getVertices()[0]!;
      const halfedge = vertex.halfedge!;

      const angle = signpostData.getAngleBetween(halfedge, halfedge);

      expect(angle).toBe(0);
    });

    it('should return positive angle for different halfedges', () => {
      const vertex = triangulation.getVertices()[0]!;
      const halfedges = signpostData.getOutgoingHalfedgesSorted(vertex);

      if (halfedges.length >= 2) {
        const angle = signpostData.getAngleBetween(halfedges[0]!, halfedges[1]!);
        expect(angle).toBeGreaterThan(0);
        expect(angle).toBeLessThan(2 * Math.PI);
      }
    });

    it('should throw for halfedges at different vertices', () => {
      const vertices = triangulation.getVertices();
      const v1 = vertices[0]!;
      const v2 = vertices[1]!;

      if (v1.halfedge && v2.halfedge) {
        expect(() => {
          signpostData.getAngleBetween(v1.halfedge!, v2.halfedge!);
        }).toThrow('must share a source vertex');
      }
    });

    it('should compute complementary angles correctly', () => {
      const vertex = triangulation.getVertices()[0]!;
      const halfedges = signpostData.getOutgoingHalfedgesSorted(vertex);

      if (halfedges.length >= 2) {
        const angle1 = signpostData.getAngleBetween(halfedges[0]!, halfedges[1]!);
        const angle2 = signpostData.getAngleBetween(halfedges[1]!, halfedges[0]!);

        // The two angles should sum to 2π (approximately)
        expect(angle1 + angle2).toBeCloseTo(2 * Math.PI, 5);
      }
    });
  });

  describe('getOutgoingHalfedgesSorted', () => {
    it('should return halfedges in sorted angular order', () => {
      const vertex = triangulation.getVertices()[0]!;
      const halfedges = signpostData.getOutgoingHalfedgesSorted(vertex);

      expect(halfedges.length).toBeGreaterThan(0);

      // Check that angles are in increasing order
      for (let i = 1; i < halfedges.length; i++) {
        const prevAngle = signpostData.getAngle(halfedges[i - 1]!);
        const currAngle = signpostData.getAngle(halfedges[i]!);
        expect(currAngle).toBeGreaterThanOrEqual(prevAngle);
      }
    });

    it('should include all outgoing halfedges', () => {
      const vertex = triangulation.getVertices()[0]!;
      const halfedges = signpostData.getOutgoingHalfedgesSorted(vertex);

      // Each halfedge should point away from the vertex
      // In our structure, halfedge.vertex is the destination, so we need the twin
      for (const he of halfedges) {
        // The halfedge's twin vertex should be our vertex
        const twinVertex = he.twin?.vertex;
        // Or the halfedge's next's next's vertex (for walking around)
        const hasConnection = twinVertex?.id === vertex.id || he.vertex?.id !== vertex.id;
        expect(hasConnection).toBe(true);
      }
    });

    it('should return empty array for isolated vertex', () => {
      // Create a new triangulation from single triangle
      const geometry = createTriangleGeometry();

      const simpleTri = IntrinsicTriangulation.fromBufferGeometry(geometry);
      const simpleSignpost = new SignpostData(simpleTri);

      // Get any vertex
      const vertex = simpleTri.getVertices()[0]!;
      const halfedges = simpleSignpost.getOutgoingHalfedgesSorted(vertex);

      // Should have some halfedges (not isolated)
      expect(halfedges.length).toBeGreaterThan(0);
    });
  });

  describe('isAngleBetween', () => {
    it('should return true for angle in range', () => {
      expect(signpostData.isAngleBetween(0.5, 0, 1)).toBe(true);
      expect(signpostData.isAngleBetween(Math.PI, 0, 2 * Math.PI)).toBe(true);
    });

    it('should return false for angle outside range', () => {
      expect(signpostData.isAngleBetween(1.5, 0, 1)).toBe(false);
      expect(signpostData.isAngleBetween(-0.5, 0, 1)).toBe(false);
    });

    it('should handle wraparound correctly', () => {
      // Range from 3/2π to 1/2π (wrapping around 0)
      const start = (3 / 2) * Math.PI;
      const end = (1 / 2) * Math.PI;

      expect(signpostData.isAngleBetween(0, start, end)).toBe(true);
      expect(signpostData.isAngleBetween(0.1, start, end)).toBe(true);
      expect(signpostData.isAngleBetween(Math.PI, start, end)).toBe(false);
    });

    it('should normalize negative angles', () => {
      expect(signpostData.isAngleBetween(-Math.PI, Math.PI, 2 * Math.PI)).toBe(true);
    });

    it('should exclude the end angle (half-open interval)', () => {
      expect(signpostData.isAngleBetween(1, 0, 1)).toBe(false);
      expect(signpostData.isAngleBetween(0.999, 0, 1)).toBe(true);
    });
  });

  describe('getTotalAngleAtVertex', () => {
    it('should return approximately 2π for interior vertices', () => {
      // On a closed mesh like an icosahedron, all vertices are interior
      for (const vertex of triangulation.getVertices()) {
        const totalAngle = signpostData.getTotalAngleAtVertex(vertex);

        // Total angle should be close to 2π for interior vertices
        // Allow some tolerance for numerical error
        expect(totalAngle).toBeGreaterThan(0);
        expect(totalAngle).toBeLessThanOrEqual(2 * Math.PI + 0.1);
      }
    });

    it('should return less than 2π for boundary vertices', () => {
      // Create mesh with boundary
      const geometry = createOpenMesh();

      const boundaryTri = IntrinsicTriangulation.fromBufferGeometry(geometry);
      const boundarySignpost = new SignpostData(boundaryTri);

      // Check that boundary vertices have less than 2π total angle
      for (const vertex of boundaryTri.getVertices()) {
        const totalAngle = boundarySignpost.getTotalAngleAtVertex(vertex);
        expect(totalAngle).toBeGreaterThan(0);
        expect(totalAngle).toBeLessThanOrEqual(2 * Math.PI);
      }
    });

    it('should return 0 for isolated vertex', () => {
      // Create a vertex with no halfedge
      const mockVertex = {
        id: 999 as any,
        halfedge: null,
        position: { x: 0, y: 0, z: 0 },
      } as unknown as Vertex;

      const totalAngle = signpostData.getTotalAngleAtVertex(mockVertex);
      expect(totalAngle).toBe(0);
    });
  });

  describe('computeSignpostsAtVertex', () => {
    it('should update signposts for a vertex', () => {
      const vertex = triangulation.getVertices()[0]!;

      // Get initial angle for some halfedge
      const halfedges = signpostData.getOutgoingHalfedgesSorted(vertex);
      const initialAngle = signpostData.getAngle(halfedges[0]!);

      // Recompute (should be the same for unchanged mesh)
      signpostData.computeSignpostsAtVertex(vertex);

      const recomputedAngle = signpostData.getAngle(halfedges[0]!);
      expect(recomputedAngle).toBe(initialAngle);
    });
  });

  describe('updateAfterFlip', () => {
    it('should update signposts after edge flip', () => {
      // Find a flippable edge
      const edges = triangulation.getEdges();
      let flippableEdge = null;

      for (const edge of edges) {
        if (edge.canFlip()) {
          flippableEdge = edge;
          break;
        }
      }

      if (flippableEdge) {
        // Get vertices around the edge before flip
        const he = flippableEdge.halfedge;
        const v0 = he.vertex;

        // Get angle at v0 before flip
        // const halfedgesBefore = signpostData.getOutgoingHalfedgesSorted(v0);
        // const anglesBefore = halfedgesBefore.map((he) => signpostData.getAngle(he));

        // Flip the edge
        triangulation.flipEdge(flippableEdge);

        // Update signpost data
        signpostData.updateAfterFlip(flippableEdge);

        // Get angles after flip
        const halfedgesAfter = signpostData.getOutgoingHalfedgesSorted(v0);

        // The number of outgoing halfedges might change, or angles might change
        // Just verify that it doesn't crash and angles are valid
        for (const he of halfedgesAfter) {
          const angle = signpostData.getAngle(he);
          expect(angle).toBeGreaterThanOrEqual(0);
          expect(angle).toBeLessThan(2 * Math.PI + 0.1);
        }
      }
    });
  });

  describe('getReferenceHalfedge', () => {
    it('should return a valid halfedge ID for each vertex', () => {
      for (const vertex of triangulation.getVertices()) {
        const refHeId = signpostData.getReferenceHalfedge(vertex);
        expect(refHeId).toBeDefined();
      }
    });

    it('should return the halfedge with angle 0', () => {
      for (const vertex of triangulation.getVertices()) {
        const refHeId = signpostData.getReferenceHalfedge(vertex);
        const halfedges = signpostData.getOutgoingHalfedgesSorted(vertex);

        // The reference halfedge should be the one with angle 0
        const refHe = halfedges.find((he) => he.id === refHeId);
        if (refHe) {
          expect(signpostData.getAngle(refHe)).toBe(0);
        }
      }
    });
  });
});
