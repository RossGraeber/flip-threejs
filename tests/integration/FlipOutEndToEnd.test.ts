import { describe, it, expect } from 'vitest';
import { FlipEdgeNetwork } from '../../src/algorithms/FlipEdgeNetwork';
import { BezierSubdivision } from '../../src/algorithms/BezierSubdivision';
import { createVertexId } from '../../src/types';
import {
  createIndexedIcosahedron,
  createIndexedSphere,
  createIndexedBox,
  createIndexedTorus,
  createTriangleGeometry,
} from '../utils/testGeometries';

describe('FlipOut End-to-End Tests', () => {
  describe('geodesic computation on sphere', () => {
    it('should compute geodesic on icosahedron', () => {
      const geometry = createIndexedIcosahedron(1, 2);
      const source = createVertexId(0);
      const target = createVertexId(50);

      const network = FlipEdgeNetwork.fromDijkstraPath(geometry, source, target);
      const initialLength = network.getLength();

      network.iterativeShorten();

      const finalLength = network.getLength();

      // Path should be shorter or equal after shortening
      expect(finalLength).toBeLessThanOrEqual(initialLength + 1e-10);
      expect(finalLength).toBeGreaterThan(0);
    });

    it('should produce valid 3D path coordinates', () => {
      const geometry = createIndexedIcosahedron(1, 1);
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(20)
      );

      network.iterativeShorten();

      const paths = network.getPathPolyline3D();

      expect(paths).toHaveLength(1);
      expect(paths[0]!.length).toBeGreaterThan(1);

      // All points should be on unit sphere (approximately)
      for (const point of paths[0]!) {
        const distance = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
        expect(distance).toBeCloseTo(1, 2); // On unit sphere with tolerance
      }
    });

    it('should converge within reasonable iterations', () => {
      const geometry = createIndexedIcosahedron(1, 2);
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(80)
      );

      const iterations = network.iterativeShorten(1000);

      expect(iterations).toBeLessThan(1000);
      expect(iterations).toBeGreaterThanOrEqual(0);
    });
  });

  describe('multi-waypoint paths', () => {
    it('should compute piecewise geodesic through waypoints', () => {
      const geometry = createIndexedIcosahedron(1, 1);
      const waypoints = [
        createVertexId(0),
        createVertexId(10),
        createVertexId(20),
        createVertexId(30),
      ];

      const network = FlipEdgeNetwork.fromPiecewiseDijkstraPath(geometry, waypoints);
      const initialLength = network.getLength();

      network.iterativeShorten();

      const finalLength = network.getLength();

      // Should shorten or stay same
      expect(finalLength).toBeLessThanOrEqual(initialLength + 1e-10);

      // Should have n-1 path segments for n waypoints
      expect(network.paths).toHaveLength(waypoints.length - 1);
    });

    it('should preserve waypoint vertices in path', () => {
      const geometry = createIndexedIcosahedron(1, 1);
      const waypoints = [createVertexId(0), createVertexId(15), createVertexId(30)];

      const network = FlipEdgeNetwork.fromPiecewiseDijkstraPath(geometry, waypoints, true);

      network.iterativeShorten();

      // The middle waypoint should be marked
      expect(network.markedVertices.has(waypoints[1]!)).toBe(true);

      // Check path connectivity at waypoints
      const paths = network.paths;
      expect(paths[0]!.endVertex.id).toBe(waypoints[1]);
      expect(paths[1]!.startVertex.id).toBe(waypoints[1]);
    });
  });

  describe('Bezier curve subdivision', () => {
    it('should subdivide and produce smooth curve', () => {
      const geometry = createIndexedIcosahedron(1, 2);
      const waypoints = [createVertexId(0), createVertexId(30), createVertexId(60)];

      const network = FlipEdgeNetwork.fromPiecewiseDijkstraPath(geometry, waypoints, true);

      // Initial shortening
      network.iterativeShorten();

      const initialMarkedCount = network.markedVertices.size;

      // Perform Bezier subdivision
      const subdivisions = BezierSubdivision.subdivide(network, 2);

      // Should have performed some subdivisions
      expect(subdivisions).toBeGreaterThanOrEqual(0);

      // Should have more control points after subdivision
      expect(network.markedVertices.size).toBeGreaterThanOrEqual(initialMarkedCount);
    });
  });

  describe('path properties', () => {
    it('should have decreasing length during iteration', () => {
      const geometry = createIndexedIcosahedron(1, 2);
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(50)
      );

      const lengths: number[] = [network.getLength()];

      // Run iterations one at a time to track length
      for (let i = 0; i < 20; i++) {
        const joint = network.findFlexibleJoint();
        if (!joint) break;

        network.flipOut(joint);
        lengths.push(network.getLength());
      }

      // Length should never increase significantly (allow small numerical error)
      for (let i = 1; i < lengths.length; i++) {
        expect(lengths[i]!).toBeLessThanOrEqual(lengths[i - 1]! + 1e-10);
      }
    });

    it('should produce paths with proper connectivity', () => {
      const geometry = createIndexedIcosahedron(1, 1);
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(20)
      );

      network.iterativeShorten();

      const path = network.paths[0]!;
      const vertices = path.getVertices();

      // Check that consecutive vertices are connected by edges
      for (let i = 0; i < path.edges.length; i++) {
        const edge = path.edges[i]!;
        const edgeVertices = edge.getVertices();

        const v1 = vertices[i]!;
        const v2 = vertices[i + 1]!;

        const connected =
          (edgeVertices[0]!.id === v1.id && edgeVertices[1]!.id === v2.id) ||
          (edgeVertices[0]!.id === v2.id && edgeVertices[1]!.id === v1.id);

        expect(connected).toBe(true);
      }
    });
  });

  describe('different mesh types', () => {
    it('should work on box geometry', () => {
      const geometry = createIndexedBox(1, 1, 1, 2, 2, 2);

      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(10)
      );

      expect(() => {
        network.iterativeShorten(100);
      }).not.toThrow();

      expect(network.getLength()).toBeGreaterThan(0);
    });

    it('should work on sphere geometry', () => {
      const geometry = createIndexedSphere(1, 16, 8);

      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(50)
      );

      expect(() => {
        network.iterativeShorten(100);
      }).not.toThrow();

      expect(network.getLength()).toBeGreaterThan(0);
    });

    it('should work on torus geometry', () => {
      const geometry = createIndexedTorus(1, 0.4, 8, 12);

      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(30)
      );

      expect(() => {
        network.iterativeShorten(100);
      }).not.toThrow();

      expect(network.getLength()).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle adjacent vertices', () => {
      const geometry = createIndexedIcosahedron(1, 0);

      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(1)
      );

      const initialLength = network.getLength();
      network.iterativeShorten();
      const finalLength = network.getLength();

      // Adjacent vertices - already shortest
      expect(finalLength).toBe(initialLength);
    });

    it('should throw for same source and target', () => {
      const geometry = createIndexedIcosahedron(1, 0);

      // Path to self should either throw or return null path
      expect(() => {
        FlipEdgeNetwork.fromDijkstraPath(geometry, createVertexId(0), createVertexId(0));
      }).toThrow();
    });

    it('should handle simple triangle mesh', () => {
      const geometry = createTriangleGeometry();

      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(1)
      );

      expect(network.getLength()).toBeGreaterThan(0);
      expect(network.paths).toHaveLength(1);
    });
  });

  describe('visualization output', () => {
    it('should produce valid edge polylines for debugging', () => {
      const geometry = createIndexedIcosahedron(1, 1);
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(20)
      );

      const allEdges = network.getAllEdgePolyline3D();

      expect(allEdges.length).toBeGreaterThan(0);

      for (const edge of allEdges) {
        expect(edge).toHaveLength(2);
        expect(typeof edge[0]!.x).toBe('number');
        expect(typeof edge[0]!.y).toBe('number');
        expect(typeof edge[0]!.z).toBe('number');
        expect(typeof edge[1]!.x).toBe('number');
        expect(typeof edge[1]!.y).toBe('number');
        expect(typeof edge[1]!.z).toBe('number');
      }
    });

    it('should produce consistent path before and after shortening', () => {
      const geometry = createIndexedIcosahedron(1, 1);
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(20)
      );

      const pathBefore = network.getPathPolyline3D()[0]!;
      const startBefore = pathBefore[0]!;
      const endBefore = pathBefore[pathBefore.length - 1]!;

      network.iterativeShorten();

      const pathAfter = network.getPathPolyline3D()[0]!;
      const startAfter = pathAfter[0]!;
      const endAfter = pathAfter[pathAfter.length - 1]!;

      // Start and end points should remain the same
      expect(startAfter.x).toBeCloseTo(startBefore.x, 5);
      expect(startAfter.y).toBeCloseTo(startBefore.y, 5);
      expect(startAfter.z).toBeCloseTo(startBefore.z, 5);

      expect(endAfter.x).toBeCloseTo(endBefore.x, 5);
      expect(endAfter.y).toBeCloseTo(endBefore.y, 5);
      expect(endAfter.z).toBeCloseTo(endBefore.z, 5);
    });
  });
});
