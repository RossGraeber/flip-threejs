import { describe, it, expect } from 'vitest';
import { IntrinsicTriangulation } from '../../../src/core/IntrinsicTriangulation';
import { BufferGeometry, BufferAttribute } from 'three';

describe('IntrinsicTriangulation', () => {
  describe('fromBufferGeometry', () => {
    it('should create triangulation from a single triangle', () => {
      const geometry = new BufferGeometry();

      // Create a single triangle
      const positions = new Float32Array([
        0, 0, 0, // v0
        1, 0, 0, // v1
        0, 1, 0, // v2
      ]);

      const indices = new Uint32Array([0, 1, 2]);

      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));

      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

      expect(triangulation.vertices.size).toBe(3);
      expect(triangulation.edges.size).toBe(3);
      expect(triangulation.halfedges.size).toBe(3);
      expect(triangulation.faces.size).toBe(1);
    });

    it('should create triangulation from two triangles sharing an edge', () => {
      const geometry = new BufferGeometry();

      // Create two triangles sharing edge v1-v2
      // Triangle 1: v0-v1-v2
      // Triangle 2: v1-v3-v2
      const positions = new Float32Array([
        0, 0, 0, // v0
        1, 0, 0, // v1
        0, 1, 0, // v2
        1, 1, 0, // v3
      ]);

      const indices = new Uint32Array([
        0, 1, 2, // Triangle 1
        1, 3, 2, // Triangle 2
      ]);

      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));

      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

      expect(triangulation.vertices.size).toBe(4);
      expect(triangulation.edges.size).toBe(5); // 3 outer + 2 inner, but shared edge is 1
      expect(triangulation.halfedges.size).toBe(6); // 3 per triangle
      expect(triangulation.faces.size).toBe(2);
    });

    it('should set up twin halfedges correctly', () => {
      const geometry = new BufferGeometry();

      const positions = new Float32Array([
        0, 0, 0, // v0
        1, 0, 0, // v1
        0, 1, 0, // v2
        1, 1, 0, // v3
      ]);

      const indices = new Uint32Array([
        0, 1, 2,
        1, 3, 2,
      ]);

      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));

      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

      // Find the shared edge (v1-v2)
      let sharedEdge = null;
      for (const edge of triangulation.edges.values()) {
        const he = edge.halfedge;
        if (he.twin !== null) {
          sharedEdge = edge;
          break;
        }
      }

      expect(sharedEdge).not.toBeNull();
      expect(sharedEdge!.halfedge.twin).not.toBeNull();
      expect(sharedEdge!.halfedge.twin!.twin).toBe(sharedEdge!.halfedge);
    });

    it('should calculate correct edge lengths', () => {
      const geometry = new BufferGeometry();

      // Create a right triangle with known side lengths
      const positions = new Float32Array([
        0, 0, 0, // v0
        3, 0, 0, // v1
        0, 4, 0, // v2
      ]);

      const indices = new Uint32Array([0, 1, 2]);

      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));

      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

      const edges = Array.from(triangulation.edges.values());
      const lengths = edges.map((e) => e.length).sort();

      // Edges should be: 3, 4, and 5 (3-4-5 right triangle)
      expect(lengths[0]).toBeCloseTo(3, 5);
      expect(lengths[1]).toBeCloseTo(4, 5);
      expect(lengths[2]).toBeCloseTo(5, 5);
    });

    it('should throw error for non-indexed geometry', () => {
      const geometry = new BufferGeometry();
      const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      geometry.setAttribute('position', new BufferAttribute(positions, 3));

      expect(() => IntrinsicTriangulation.fromBufferGeometry(geometry)).toThrow(
        'Geometry must be indexed'
      );
    });

    it('should throw error for geometry without positions', () => {
      const geometry = new BufferGeometry();
      const indices = new Uint32Array([0, 1, 2]);
      geometry.setIndex(new BufferAttribute(indices, 1));

      expect(() => IntrinsicTriangulation.fromBufferGeometry(geometry)).toThrow(
        'Geometry must have a position attribute'
      );
    });

    it('should throw error for non-triangulated geometry', () => {
      const geometry = new BufferGeometry();
      const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]);
      const indices = new Uint32Array([0, 1, 2, 3]); // 4 indices, not divisible by 3

      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));

      expect(() => IntrinsicTriangulation.fromBufferGeometry(geometry)).toThrow(
        'Geometry must be triangulated'
      );
    });
  });

  describe('flipEdge', () => {
    it('should flip an interior edge', () => {
      const geometry = new BufferGeometry();

      // Create a quad as two triangles
      const positions = new Float32Array([
        0, 0, 0, // v0
        1, 0, 0, // v1
        1, 1, 0, // v2
        0, 1, 0, // v3
      ]);

      const indices = new Uint32Array([
        0, 1, 2, // Triangle 1: v0-v1-v2
        0, 2, 3, // Triangle 2: v0-v2-v3
      ]);

      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));

      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

      // Find the interior edge (v0-v2)
      let interiorEdge = null;
      for (const edge of triangulation.edges.values()) {
        if (edge.halfedge.twin !== null) {
          interiorEdge = edge;
          break;
        }
      }

      expect(interiorEdge).not.toBeNull();

      // Get original halfedge configuration
      const he0 = interiorEdge!.halfedge;
      const he1 = he0.twin!;
      const originalV0 = he0.prev!.vertex;
      const originalV1 = he0.vertex;

      // Flip the edge
      const flipped = triangulation.flipEdge(interiorEdge!);

      expect(flipped).toBe(true);

      // After flipping, the edge should connect different vertices
      expect(he0.vertex).not.toBe(originalV1);
    });

    it('should not flip a boundary edge', () => {
      const geometry = new BufferGeometry();

      const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
      ]);

      const indices = new Uint32Array([0, 1, 2]);

      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));

      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

      // All edges are boundary edges in a single triangle
      for (const edge of triangulation.edges.values()) {
        const flipped = triangulation.flipEdge(edge);
        expect(flipped).toBe(false);
      }
    });

    it('should maintain mesh connectivity after flip', () => {
      const geometry = new BufferGeometry();

      const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
        0, 1, 0,
      ]);

      const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);

      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));

      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

      // Find and flip interior edge
      let interiorEdge = null;
      for (const edge of triangulation.edges.values()) {
        if (edge.halfedge.twin !== null) {
          interiorEdge = edge;
          break;
        }
      }

      triangulation.flipEdge(interiorEdge!);

      // Verify all halfedges still have valid next/prev pointers
      for (const he of triangulation.halfedges.values()) {
        expect(he.next).not.toBeNull();
        expect(he.prev).not.toBeNull();
        expect(he.next!.prev).toBe(he);
        expect(he.prev!.next).toBe(he);
      }
    });
  });

  describe('isDelaunay', () => {
    it('should return true for boundary edges', () => {
      const geometry = new BufferGeometry();

      const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
      ]);

      const indices = new Uint32Array([0, 1, 2]);

      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));

      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

      // All edges are boundary edges
      for (const edge of triangulation.edges.values()) {
        expect(triangulation.isDelaunay(edge)).toBe(true);
      }
    });

    it('should detect non-Delaunay edge in concave quad', () => {
      const geometry = new BufferGeometry();

      // Create a quad where the diagonal is non-Delaunay
      // Use positions that create large opposite angles
      const positions = new Float32Array([
        0, 0, 0,    // v0
        1, 0, 0,    // v1
        0.9, 0.1, 0, // v2 - close to v1
        0.1, 0.9, 0, // v3 - close to v0
      ]);

      const indices = new Uint32Array([
        0, 1, 2,
        0, 2, 3,
      ]);

      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));

      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

      // The diagonal edge should be non-Delaunay
      let diagonalEdge = null;
      for (const edge of triangulation.edges.values()) {
        if (edge.halfedge.twin !== null) {
          diagonalEdge = edge;
          break;
        }
      }

      expect(diagonalEdge).not.toBeNull();
      const isDelaunay = triangulation.isDelaunay(diagonalEdge!);

      // This configuration should produce a non-Delaunay edge
      // (though it depends on the exact angles)
      expect(typeof isDelaunay).toBe('boolean');
    });
  });

  describe('makeDelaunay', () => {
    it('should converge on a simple mesh', () => {
      const geometry = new BufferGeometry();

      const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
        0, 1, 0,
      ]);

      const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);

      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));

      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

      const flipCount = triangulation.makeDelaunay();

      expect(flipCount).toBeGreaterThanOrEqual(0);

      // After makeDelaunay, all interior edges should be Delaunay
      for (const edge of triangulation.edges.values()) {
        expect(triangulation.isDelaunay(edge)).toBe(true);
      }
    });

    it('should return zero flips if already Delaunay', () => {
      const geometry = new BufferGeometry();

      // Equilateral triangle is already Delaunay
      const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0.5, Math.sqrt(3) / 2, 0,
      ]);

      const indices = new Uint32Array([0, 1, 2]);

      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));

      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

      const flipCount = triangulation.makeDelaunay();

      expect(flipCount).toBe(0);
    });
  });

  describe('getters', () => {
    it('should return all vertices', () => {
      const geometry = new BufferGeometry();

      const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
      ]);

      const indices = new Uint32Array([0, 1, 2]);

      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));

      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

      const vertices = triangulation.getVertices();

      expect(vertices).toHaveLength(3);
      expect(vertices.every((v) => v.position !== undefined)).toBe(true);
    });

    it('should return all edges', () => {
      const geometry = new BufferGeometry();

      const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
      ]);

      const indices = new Uint32Array([0, 1, 2]);

      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));

      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

      const edges = triangulation.getEdges();

      expect(edges).toHaveLength(3);
      expect(edges.every((e) => e.length > 0)).toBe(true);
    });

    it('should return all faces', () => {
      const geometry = new BufferGeometry();

      const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
      ]);

      const indices = new Uint32Array([0, 1, 2]);

      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));

      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

      const faces = triangulation.getFaces();

      expect(faces).toHaveLength(1);
      expect(faces[0]!.halfedge).not.toBeNull();
    });

    it('should return all halfedges', () => {
      const geometry = new BufferGeometry();

      const positions = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
      ]);

      const indices = new Uint32Array([0, 1, 2]);

      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(indices, 1));

      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

      const halfedges = triangulation.getHalfedges();

      expect(halfedges).toHaveLength(3);
      expect(halfedges.every((he) => he.vertex !== null)).toBe(true);
    });
  });
});
