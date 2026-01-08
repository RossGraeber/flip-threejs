import { describe, it, expect } from 'vitest';
import { GeodesicLoopNetwork } from '../../src/algorithms/GeodesicLoopNetwork';
import { IntrinsicTriangulation } from '../../src/core/IntrinsicTriangulation';
import { createIndexedIcosahedron, createIndexedTorus } from '../utils/testGeometries';

describe('GeodesicLoop End-to-End', () => {
  describe('on icosahedron', () => {
    it('should compute a geodesic loop from edge waypoints', () => {
      const geometry = createIndexedIcosahedron(1, 1);
      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);
      const edgeCount = triangulation.getEdges().length;

      // Select a few edges as waypoints (spread around the mesh)
      const waypointIndices = [0, Math.floor(edgeCount / 4), Math.floor(edgeCount / 2)];

      const network = GeodesicLoopNetwork.fromEdgeWaypoints(geometry, waypointIndices, {
        verbose: false,
        maxIterations: 100,
      });

      const result = network.compute();

      expect(result.loop).toBeDefined();
      expect(result.loop.edges.length).toBeGreaterThanOrEqual(3);
      expect(result.segmentation).toBeDefined();
      expect(result.stats).toBeDefined();
    });

    it('should produce a closed loop', () => {
      const geometry = createIndexedIcosahedron(1, 1);

      const waypointIndices = [0, 5, 10];

      const network = GeodesicLoopNetwork.fromEdgeWaypoints(geometry, waypointIndices, {
        verbose: false,
      });

      network.compute();
      const polyline = network.getLoopPolyline3D();

      // Polyline should be closed (first and last points are the same)
      expect(polyline.length).toBeGreaterThan(3);
      const first = polyline[0]!;
      const last = polyline[polyline.length - 1]!;
      expect(first.x).toBeCloseTo(last.x, 5);
      expect(first.y).toBeCloseTo(last.y, 5);
      expect(first.z).toBeCloseTo(last.z, 5);
    });

    it('should segment mesh into inside and outside regions', () => {
      const geometry = createIndexedIcosahedron(1, 1);
      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

      const waypointIndices = [0, 10, 20];

      const network = GeodesicLoopNetwork.fromEdgeWaypoints(geometry, waypointIndices, {
        verbose: false,
      });

      const result = network.compute();

      // Should have faces on both sides
      const totalFaces = triangulation.getFaces().length;
      const segmentedFaces =
        result.segmentation.insideFaces.length +
        result.segmentation.outsideFaces.length +
        result.segmentation.boundaryFaces.length;

      expect(segmentedFaces).toBe(totalFaces);
    });

    it('should track statistics', () => {
      const geometry = createIndexedIcosahedron(1, 1);

      const waypointIndices = [0, 5, 10];

      const network = GeodesicLoopNetwork.fromEdgeWaypoints(geometry, waypointIndices, {
        verbose: false,
      });

      const result = network.compute();

      expect(result.stats.inputEdgeCount).toBe(3);
      expect(result.stats.executionTime).toBeGreaterThan(0);
      expect(result.stats.initialLength).toBeGreaterThan(0);
      expect(result.stats.finalLength).toBeGreaterThan(0);
      // Geodesic should be shorter or equal to initial
      expect(result.stats.finalLength).toBeLessThanOrEqual(result.stats.initialLength + 0.001);
    });
  });

  describe('on torus', () => {
    it('should compute a geodesic loop on a torus', () => {
      const geometry = createIndexedTorus(1, 0.4, 12, 16);

      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);
      const edgeCount = triangulation.getEdges().length;

      // Select edges spread around the torus
      const waypointIndices = [0, Math.floor(edgeCount / 3), Math.floor((2 * edgeCount) / 3)];

      const network = GeodesicLoopNetwork.fromEdgeWaypoints(geometry, waypointIndices, {
        verbose: false,
        maxIterations: 200,
      });

      const result = network.compute();

      expect(result.loop).toBeDefined();
      expect(result.loop.edges.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('edge ordering optimization', () => {
    it('should optimize edge visiting order by default', () => {
      const geometry = createIndexedIcosahedron(1, 1);

      const waypointIndices = [0, 10, 20, 30];

      const network = GeodesicLoopNetwork.fromEdgeWaypoints(geometry, waypointIndices, {
        optimizeOrder: true,
        verbose: false,
      });

      const result = network.compute();

      expect(result.loop).toBeDefined();
      expect(result.stats.orderingTime).toBeGreaterThanOrEqual(0);
    });

    it('should work with ordering disabled', () => {
      const geometry = createIndexedIcosahedron(1, 1);

      const waypointIndices = [0, 5, 10];

      const network = GeodesicLoopNetwork.fromEdgeWaypoints(geometry, waypointIndices, {
        optimizeOrder: false,
        verbose: false,
      });

      const result = network.compute();

      expect(result.loop).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle single edge input', () => {
      const geometry = createIndexedIcosahedron(1, 1);

      const network = GeodesicLoopNetwork.fromEdgeWaypoints(geometry, [0], {
        verbose: false,
      });

      // Single edge should throw or produce minimal loop
      expect(() => network.compute()).toThrow();
    });

    it('should handle empty edge input', () => {
      const geometry = createIndexedIcosahedron(1, 1);

      const network = GeodesicLoopNetwork.fromEdgeWaypoints(geometry, [], {
        verbose: false,
      });

      expect(() => network.compute()).toThrow();
    });
  });

  describe('factory methods', () => {
    it('should create network from edge IDs', () => {
      const geometry = createIndexedIcosahedron(1, 1);
      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);
      const allEdges = triangulation.getEdges();

      const edgeIds = [allEdges[0]!.id, allEdges[5]!.id, allEdges[10]!.id];

      const network = GeodesicLoopNetwork.fromEdgeIds(geometry, edgeIds, {
        verbose: false,
      });

      const result = network.compute();
      expect(result.loop).toBeDefined();
    });

    it('should create network from Edge objects directly', () => {
      const geometry = createIndexedIcosahedron(1, 1);
      const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);
      const allEdges = triangulation.getEdges();

      const selectedEdges = [allEdges[0]!, allEdges[5]!, allEdges[10]!];

      const network = GeodesicLoopNetwork.fromEdges(triangulation, selectedEdges, {
        verbose: false,
      });

      const result = network.compute();
      expect(result.loop).toBeDefined();
    });
  });

  describe('getters', () => {
    it('should return loop length', () => {
      const geometry = createIndexedIcosahedron(1, 1);

      const network = GeodesicLoopNetwork.fromEdgeWaypoints(geometry, [0, 5, 10], {
        verbose: false,
      });

      network.compute();

      const length = network.getLength();
      expect(length).toBeGreaterThan(0);
    });

    it('should return segmentation', () => {
      const geometry = createIndexedIcosahedron(1, 1);

      const network = GeodesicLoopNetwork.fromEdgeWaypoints(geometry, [0, 5, 10], {
        verbose: false,
      });

      network.compute();

      const segmentation = network.getSegmentation();
      expect(segmentation).not.toBeNull();
    });

    it('should return 3D polyline', () => {
      const geometry = createIndexedIcosahedron(1, 1);

      const network = GeodesicLoopNetwork.fromEdgeWaypoints(geometry, [0, 5, 10], {
        verbose: false,
      });

      network.compute();

      const polyline = network.getLoopPolyline3D();
      expect(polyline.length).toBeGreaterThan(0);

      for (const point of polyline) {
        expect(typeof point.x).toBe('number');
        expect(typeof point.y).toBe('number');
        expect(typeof point.z).toBe('number');
      }
    });
  });
});
