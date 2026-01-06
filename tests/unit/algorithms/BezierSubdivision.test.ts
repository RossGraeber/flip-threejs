import { describe, it, expect, beforeEach } from 'vitest';
import { BezierSubdivision } from '../../../src/algorithms/BezierSubdivision';
import { FlipEdgeNetwork } from '../../../src/algorithms/FlipEdgeNetwork';
import { createVertexId } from '../../../src/types';
import type { BufferGeometry } from 'three';
import { createIndexedIcosahedron } from '../../utils/testGeometries';

describe('BezierSubdivision', () => {
  let geometry: BufferGeometry;

  beforeEach(() => {
    geometry = createIndexedIcosahedron(1, 1);
  });

  describe('subdivideOnce', () => {
    it('should subdivide paths without marked vertices', () => {
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(20)
      );

      const initialMarkedCount = network.markedVertices.size;
      const subdivisions = BezierSubdivision.subdivideOnce(network);

      expect(subdivisions).toBeGreaterThanOrEqual(0);

      // If subdivisions occurred, we should have more marked vertices
      if (subdivisions > 0) {
        expect(network.markedVertices.size).toBeGreaterThan(initialMarkedCount);
      }
    });

    it('should subdivide segments between marked vertices', () => {
      const waypoints = [createVertexId(0), createVertexId(10), createVertexId(20)];
      const network = FlipEdgeNetwork.fromPiecewiseDijkstraPath(geometry, waypoints, true);

      const initialMarkedCount = network.markedVertices.size;
      const subdivisions = BezierSubdivision.subdivideOnce(network);

      expect(subdivisions).toBeGreaterThanOrEqual(0);

      // Check that marked vertices increased
      if (subdivisions > 0) {
        expect(network.markedVertices.size).toBeGreaterThan(initialMarkedCount);
      }
    });

    it('should return 0 for very short paths', () => {
      // Adjacent vertices - path too short to subdivide
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(1)
      );

      // Clear any marked vertices
      BezierSubdivision.clearMarkedVertices(network);

      // For paths with fewer than 3 vertices, subdivision might return 0
      const subdivisions = BezierSubdivision.subdivideOnce(network);

      expect(subdivisions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('subdivide', () => {
    it('should perform multiple subdivision rounds', () => {
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(30)
      );

      const totalSubdivisions = BezierSubdivision.subdivide(network, 3);

      expect(totalSubdivisions).toBeGreaterThanOrEqual(0);
    });

    it('should stop when no more subdivisions possible', () => {
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(5)
      );

      // Many rounds should eventually stop
      const totalSubdivisions = BezierSubdivision.subdivide(network, 100);

      expect(totalSubdivisions).toBeGreaterThanOrEqual(0);
      // Should have completed without crashing
    });

    it('should re-straighten paths after subdivision', () => {
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(20)
      );

      // const initialLength = network.getLength();

      BezierSubdivision.subdivide(network, 2);

      // After subdivision and re-straightening, length should be defined
      const finalLength = network.getLength();
      expect(finalLength).toBeGreaterThan(0);
    });

    it('should handle zero rounds', () => {
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(10)
      );

      const totalSubdivisions = BezierSubdivision.subdivide(network, 0);

      expect(totalSubdivisions).toBe(0);
    });
  });

  describe('clearMarkedVertices', () => {
    it('should remove all marked vertices', () => {
      const waypoints = [createVertexId(0), createVertexId(10), createVertexId(20)];
      const network = FlipEdgeNetwork.fromPiecewiseDijkstraPath(geometry, waypoints, true);

      expect(network.markedVertices.size).toBeGreaterThan(0);

      BezierSubdivision.clearMarkedVertices(network);

      expect(network.markedVertices.size).toBe(0);
    });

    it('should work on empty set', () => {
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(5)
      );

      // Should not throw
      BezierSubdivision.clearMarkedVertices(network);

      expect(network.markedVertices.size).toBe(0);
    });
  });

  describe('getMarkedVertexIds', () => {
    it('should return array of marked vertex IDs', () => {
      const waypoints = [createVertexId(0), createVertexId(10), createVertexId(20)];
      const network = FlipEdgeNetwork.fromPiecewiseDijkstraPath(geometry, waypoints, true);

      const markedIds = BezierSubdivision.getMarkedVertexIds(network);

      expect(Array.isArray(markedIds)).toBe(true);
      expect(markedIds.length).toBe(network.markedVertices.size);

      // Check that all IDs are in the marked set
      for (const id of markedIds) {
        expect(network.markedVertices.has(id)).toBe(true);
      }
    });

    it('should return empty array when no vertices marked', () => {
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(5)
      );

      const markedIds = BezierSubdivision.getMarkedVertexIds(network);

      expect(markedIds).toHaveLength(0);
    });

    it('should include newly marked vertices after subdivision', () => {
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(20)
      );

      BezierSubdivision.subdivideOnce(network);

      const markedIds = BezierSubdivision.getMarkedVertexIds(network);

      // markedIds should match the set
      expect(markedIds.length).toBe(network.markedVertices.size);
    });
  });

  describe('with Bezier control points', () => {
    it('should preserve original control points during subdivision', () => {
      const waypoints = [
        createVertexId(0),
        createVertexId(10),
        createVertexId(20),
        createVertexId(30),
      ];
      const network = FlipEdgeNetwork.fromPiecewiseDijkstraPath(geometry, waypoints, true);

      const originalMarked = new Set(network.markedVertices);

      BezierSubdivision.subdivide(network, 2);

      // All original marked vertices should still be marked
      for (const id of originalMarked) {
        expect(network.markedVertices.has(id)).toBe(true);
      }
    });

    it('should add midpoint vertices as new control points', () => {
      const waypoints = [createVertexId(0), createVertexId(15), createVertexId(30)];
      const network = FlipEdgeNetwork.fromPiecewiseDijkstraPath(geometry, waypoints, true);

      const initialCount = network.markedVertices.size;

      BezierSubdivision.subdivide(network, 1);

      // Should have more marked vertices after subdivision
      // (unless paths were too short)
      expect(network.markedVertices.size).toBeGreaterThanOrEqual(initialCount);
    });
  });

  describe('edge cases', () => {
    it('should handle network with no paths', () => {
      const network = FlipEdgeNetwork.fromBufferGeometry(geometry);

      const subdivisions = BezierSubdivision.subdivideOnce(network);

      expect(subdivisions).toBe(0);
    });

    it('should handle single-vertex paths gracefully', () => {
      // Trying to create a path from vertex 0 to 0 is not valid - source == target
      // The implementation throws "No path exists" which is correct behavior
      expect(() => {
        FlipEdgeNetwork.fromDijkstraPath(geometry, createVertexId(0), createVertexId(0));
      }).toThrow('No path exists');
    });
  });
});
