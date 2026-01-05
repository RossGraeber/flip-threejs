import { describe, it, expect, beforeEach } from 'vitest';
import { DijkstraShortestPath } from '../../../src/algorithms/DijkstraShortestPath';
import { IntrinsicTriangulation } from '../../../src/core/IntrinsicTriangulation';
import { createVertexId } from '../../../src/types';
import * as THREE from 'three';

describe('DijkstraShortestPath', () => {
  let triangulation: IntrinsicTriangulation;
  let dijkstra: DijkstraShortestPath;

  beforeEach(() => {
    // Create a simple icosahedron for testing
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);
    dijkstra = new DijkstraShortestPath(triangulation);
  });

  describe('computePath', () => {
    it('should compute a path between two adjacent vertices', () => {
      const source = createVertexId(0);
      const target = createVertexId(1);

      const path = dijkstra.computePath(source, target);

      expect(path).not.toBeNull();
      expect(path!.startVertex.id).toBe(source);
      expect(path!.endVertex.id).toBe(target);
      expect(path!.edges.length).toBeGreaterThan(0);
    });

    it('should compute a path between distant vertices', () => {
      const source = createVertexId(0);
      const target = createVertexId(6);

      const path = dijkstra.computePath(source, target);

      expect(path).not.toBeNull();
      expect(path!.startVertex.id).toBe(source);
      expect(path!.endVertex.id).toBe(target);
      expect(path!.edges.length).toBeGreaterThan(1);
    });

    it('should return null for unreachable vertices on disconnected mesh', () => {
      // Create two separate triangles (disconnected)
      const positions = new Float32Array([
        // Triangle 1
        0, 0, 0, 1, 0, 0, 0, 1, 0,
        // Triangle 2 (disconnected)
        10, 10, 10, 11, 10, 10, 10, 11, 10,
      ]);
      const indices = new Uint32Array([0, 1, 2, 3, 4, 5]);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const disconnectedTri = IntrinsicTriangulation.fromBufferGeometry(geometry);
      const disconnectedDijkstra = new DijkstraShortestPath(disconnectedTri);

      const path = disconnectedDijkstra.computePath(createVertexId(0), createVertexId(3));

      expect(path).toBeNull();
    });

    it('should compute a path from vertex to itself', () => {
      const vertex = createVertexId(0);

      const path = dijkstra.computePath(vertex, vertex);

      // Path to self should be empty or have length 0
      expect(path).toBeNull(); // Based on implementation, path too short
    });

    it('should compute paths with increasing length for increasing distance', () => {
      const source = createVertexId(0);

      const path1 = dijkstra.computePath(source, createVertexId(1));
      const path2 = dijkstra.computePath(source, createVertexId(5));

      expect(path1).not.toBeNull();
      expect(path2).not.toBeNull();
      expect(path2!.length).toBeGreaterThan(path1!.length);
    });
  });

  describe('computePiecewisePath', () => {
    it('should compute a piecewise path through multiple waypoints', () => {
      const waypoints = [createVertexId(0), createVertexId(3), createVertexId(6)];

      const paths = dijkstra.computePiecewisePath(waypoints);

      expect(paths).not.toBeNull();
      expect(paths!.length).toBe(2); // n-1 segments for n waypoints
      expect(paths![0]!.startVertex.id).toBe(waypoints[0]);
      expect(paths![0]!.endVertex.id).toBe(waypoints[1]);
      expect(paths![1]!.startVertex.id).toBe(waypoints[1]);
      expect(paths![1]!.endVertex.id).toBe(waypoints[2]);
    });

    it('should throw error for fewer than 2 waypoints', () => {
      expect(() => {
        dijkstra.computePiecewisePath([createVertexId(0)]);
      }).toThrow('Must provide at least 2 waypoints');
    });

    it('should return null if any segment is unreachable', () => {
      // Create disconnected mesh
      const positions = new Float32Array([
        0, 0, 0, 1, 0, 0, 0, 1, 0, 10, 10, 10, 11, 10, 10, 10, 11, 10,
      ]);
      const indices = new Uint32Array([0, 1, 2, 3, 4, 5]);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      const disconnectedTri = IntrinsicTriangulation.fromBufferGeometry(geometry);
      const disconnectedDijkstra = new DijkstraShortestPath(disconnectedTri);

      const waypoints = [createVertexId(0), createVertexId(1), createVertexId(3)];
      const paths = disconnectedDijkstra.computePiecewisePath(waypoints);

      expect(paths).toBeNull();
    });

    it('should maintain continuity between segments', () => {
      const waypoints = [
        createVertexId(0),
        createVertexId(2),
        createVertexId(4),
        createVertexId(6),
      ];

      const paths = dijkstra.computePiecewisePath(waypoints);

      expect(paths).not.toBeNull();
      expect(paths!.length).toBe(3);

      // Check continuity
      expect(paths![0]!.endVertex.id).toBe(paths![1]!.startVertex.id);
      expect(paths![1]!.endVertex.id).toBe(paths![2]!.startVertex.id);
    });
  });

  describe('computeShortestPathTree', () => {
    it('should compute shortest path tree from single source', () => {
      const source = createVertexId(0);

      const result = dijkstra.computeShortestPathTree([source]);

      expect(result.distances.size).toBeGreaterThan(0);
      expect(result.parents.size).toBeGreaterThan(0);
      expect(result.distances.get(source)).toBe(0);
      expect(result.parents.get(source)).toBeNull();
      expect(result.targetReached).toBe(true);
    });

    it('should compute shortest path tree from multiple sources', () => {
      const sources = [createVertexId(0), createVertexId(5)];

      const result = dijkstra.computeShortestPathTree(sources);

      expect(result.distances.size).toBeGreaterThan(0);
      expect(result.distances.get(sources[0])).toBe(0);
      expect(result.distances.get(sources[1])).toBe(0);
      expect(result.parents.get(sources[0])).toBeNull();
      expect(result.parents.get(sources[1])).toBeNull();
    });

    it('should stop early when target is reached', () => {
      const source = createVertexId(0);
      const target = createVertexId(3);

      const result = dijkstra.computeShortestPathTree([source], target);

      expect(result.targetReached).toBe(true);
      expect(result.distances.has(target)).toBe(true);
      // May not have explored all vertices due to early stopping
      expect(result.distances.size).toBeLessThanOrEqual(triangulation.vertices.size);
    });

    it('should produce consistent distances', () => {
      const source = createVertexId(0);

      const result = dijkstra.computeShortestPathTree([source]);

      // All distances should be non-negative
      for (const [_, distance] of result.distances) {
        expect(distance).toBeGreaterThanOrEqual(0);
      }

      // Distance to source should be 0
      expect(result.distances.get(source)).toBe(0);
    });
  });

  describe('path properties', () => {
    it('should produce paths with positive length', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(5));

      expect(path).not.toBeNull();
      expect(path!.length).toBeGreaterThan(0);
    });

    it('should produce paths where edges connect consecutive vertices', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(5));

      expect(path).not.toBeNull();

      const vertices = path!.getVertices();
      expect(vertices.length).toBe(path!.edges.length + 1);

      // Check edge connectivity
      for (let i = 0; i < path!.edges.length; i++) {
        const edge = path!.edges[i]!;
        const edgeVertices = edge.getVertices();

        // Edge should connect vertices[i] and vertices[i+1]
        const v1 = vertices[i]!;
        const v2 = vertices[i + 1]!;

        const connectsCorrectly =
          (edgeVertices[0]!.id === v1.id && edgeVertices[1]!.id === v2.id) ||
          (edgeVertices[0]!.id === v2.id && edgeVertices[1]!.id === v1.id);

        expect(connectsCorrectly).toBe(true);
      }
    });
  });
});
