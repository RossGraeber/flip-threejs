import { describe, it, expect, beforeEach } from 'vitest';
import { GeodesicPath } from '../../../src/algorithms/GeodesicPath';
import { DijkstraShortestPath } from '../../../src/algorithms/DijkstraShortestPath';
import { IntrinsicTriangulation } from '../../../src/core/IntrinsicTriangulation';
import { createVertexId } from '../../../src/types';
import { createIndexedIcosahedron } from '../../utils/testGeometries';

describe('GeodesicPath', () => {
  let triangulation: IntrinsicTriangulation;
  let dijkstra: DijkstraShortestPath;

  beforeEach(() => {
    const geometry = createIndexedIcosahedron(1, 0);
    triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);
    dijkstra = new DijkstraShortestPath(triangulation);
  });

  describe('constructor', () => {
    it('should create a path with edges', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(5));

      expect(path).not.toBeNull();
      expect(path!.edges.length).toBeGreaterThan(0);
      expect(path!.startVertex).toBeDefined();
      expect(path!.endVertex).toBeDefined();
    });

    it('should calculate length correctly', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(1));

      expect(path).not.toBeNull();
      expect(path!.length).toBeGreaterThan(0);

      // Manual check: length should equal sum of edge lengths
      const expectedLength = path!.edges.reduce((sum, edge) => sum + edge.length, 0);
      expect(path!.length).toBeCloseTo(expectedLength, 10);
    });
  });

  describe('getVertices', () => {
    it('should return all vertices along the path', () => {
      // Use vertices that are 2 hops apart (e.g., 0 and 10 on icosahedron)
      // Vertex 10 is the antipodal vertex to vertex 0 on a regular icosahedron
      const path = dijkstra.computePath(createVertexId(0), createVertexId(10));

      expect(path).not.toBeNull();
      const vertices = path!.getVertices();

      // Path should have edges.length + 1 vertices
      expect(vertices.length).toBe(path!.edges.length + 1);
      expect(vertices[0]!.id).toBe(path!.startVertex.id);
      expect(vertices[vertices.length - 1]!.id).toBe(path!.endVertex.id);
    });

    it('should return only start vertex for zero-edge path', () => {
      // Create a path with no edges (edge case)
      const vertex = triangulation.vertices.get(createVertexId(0))!;
      const emptyPath = new GeodesicPath([], vertex, vertex);

      const vertices = emptyPath.getVertices();

      expect(vertices).toHaveLength(1);
      expect(vertices[0]!.id).toBe(vertex.id);
    });

    it('should maintain consecutive connectivity', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(5));

      expect(path).not.toBeNull();
      const vertices = path!.getVertices();

      // Each consecutive pair of vertices should be connected by an edge
      for (let i = 0; i < vertices.length - 1; i++) {
        const v1 = vertices[i]!;
        const v2 = vertices[i + 1]!;
        const edge = path!.edges[i]!;

        const edgeVertices = edge.getVertices();
        const hasV1 = edgeVertices[0]!.id === v1.id || edgeVertices[1]!.id === v1.id;
        const hasV2 = edgeVertices[0]!.id === v2.id || edgeVertices[1]!.id === v2.id;

        expect(hasV1).toBe(true);
        expect(hasV2).toBe(true);
      }
    });
  });

  describe('getInteriorVertices', () => {
    it('should exclude start and end vertices', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(5));

      expect(path).not.toBeNull();
      const interiorVertices = path!.getInteriorVertices();
      const allVertices = path!.getVertices();

      expect(interiorVertices.length).toBe(allVertices.length - 2);

      // Interior vertices should not include start or end
      for (const v of interiorVertices) {
        expect(v.id).not.toBe(path!.startVertex.id);
        expect(v.id).not.toBe(path!.endVertex.id);
      }
    });

    it('should return empty array for single-edge path', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(1));

      expect(path).not.toBeNull();

      // Single-edge path has no interior vertices
      if (path!.edges.length === 1) {
        const interiorVertices = path!.getInteriorVertices();
        expect(interiorVertices).toHaveLength(0);
      }
    });
  });

  describe('containsVertex', () => {
    it('should return true for vertices in path', () => {
      // Use a path with multiple edges to test interior vertices
      const path = dijkstra.computePath(createVertexId(0), createVertexId(10));

      expect(path).not.toBeNull();

      expect(path!.containsVertex(path!.startVertex)).toBe(true);
      expect(path!.containsVertex(path!.endVertex)).toBe(true);

      const vertices = path!.getVertices();
      for (const v of vertices) {
        expect(path!.containsVertex(v)).toBe(true);
      }
    });

    it('should return false for vertices not in path', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(1));

      expect(path).not.toBeNull();

      // Find a vertex not in the path
      const pathVertexIds = new Set(path!.getVertices().map((v) => v.id));
      let vertexNotInPath = null;

      for (const [id, vertex] of triangulation.vertices) {
        if (!pathVertexIds.has(id)) {
          vertexNotInPath = vertex;
          break;
        }
      }

      if (vertexNotInPath) {
        expect(path!.containsVertex(vertexNotInPath)).toBe(false);
      }
    });
  });

  describe('containsEdge', () => {
    it('should return true for edges in path', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(5));

      expect(path).not.toBeNull();

      for (const edge of path!.edges) {
        expect(path!.containsEdge(edge)).toBe(true);
      }
    });

    it('should return false for edges not in path', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(1));

      expect(path).not.toBeNull();

      // Find an edge not in the path
      const pathEdgeIds = new Set(path!.edges.map((e) => e.id));
      const allEdges = triangulation.getEdges();

      const edgeNotInPath = allEdges.find((e) => !pathEdgeIds.has(e.id));

      if (edgeNotInPath) {
        expect(path!.containsEdge(edgeNotInPath)).toBe(false);
      }
    });
  });

  describe('getVertexIndex', () => {
    it('should return correct index for vertices in path', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(5));

      expect(path).not.toBeNull();

      const vertices = path!.getVertices();

      for (let i = 0; i < vertices.length; i++) {
        expect(path!.getVertexIndex(vertices[i]!)).toBe(i);
      }
    });

    it('should return -1 for vertices not in path', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(1));

      expect(path).not.toBeNull();

      // Find a vertex not in the path
      const pathVertexIds = new Set(path!.getVertices().map((v) => v.id));

      for (const [id, vertex] of triangulation.vertices) {
        if (!pathVertexIds.has(id)) {
          expect(path!.getVertexIndex(vertex)).toBe(-1);
          break;
        }
      }
    });
  });

  describe('getAngleAtVertex', () => {
    it('should throw for non-interior vertices', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(5));

      expect(path).not.toBeNull();

      // Start vertex is not interior
      expect(() => {
        path!.getAngleAtVertex(path!.startVertex);
      }).toThrow('interior vertex');

      // End vertex is not interior
      expect(() => {
        path!.getAngleAtVertex(path!.endVertex);
      }).toThrow('interior vertex');
    });

    it('should return a value for interior vertices', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(5));

      expect(path).not.toBeNull();

      const interiorVertices = path!.getInteriorVertices();

      if (interiorVertices.length > 0) {
        const angle = path!.getAngleAtVertex(interiorVertices[0]!);
        expect(typeof angle).toBe('number');
        expect(angle).toBeGreaterThan(0);
      }
    });
  });

  describe('updateLength', () => {
    it('should recalculate length correctly', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(5));

      expect(path).not.toBeNull();

      const originalLength = path!.length;

      // Call updateLength
      path!.updateLength();

      // Length should remain the same (no edges changed)
      expect(path!.length).toBeCloseTo(originalLength, 10);
    });
  });

  describe('clone', () => {
    it('should create an independent copy', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(5));

      expect(path).not.toBeNull();

      const clone = path!.clone();

      expect(clone).not.toBe(path);
      expect(clone.edges).not.toBe(path!.edges);
      expect(clone.startVertex.id).toBe(path!.startVertex.id);
      expect(clone.endVertex.id).toBe(path!.endVertex.id);
      expect(clone.length).toBe(path!.length);
      expect(clone.edges.length).toBe(path!.edges.length);
    });
  });

  describe('length property', () => {
    it('should be positive for non-trivial paths', () => {
      const path = dijkstra.computePath(createVertexId(0), createVertexId(5));

      expect(path).not.toBeNull();
      expect(path!.length).toBeGreaterThan(0);
    });

    it('should be zero for empty path', () => {
      const vertex = triangulation.vertices.get(createVertexId(0))!;
      const emptyPath = new GeodesicPath([], vertex, vertex);

      expect(emptyPath.length).toBe(0);
    });

    it('should increase with path distance', () => {
      const path1 = dijkstra.computePath(createVertexId(0), createVertexId(1));
      const path2 = dijkstra.computePath(createVertexId(0), createVertexId(5));

      expect(path1).not.toBeNull();
      expect(path2).not.toBeNull();

      // Longer path should have greater length
      if (path2!.edges.length > path1!.edges.length) {
        expect(path2!.length).toBeGreaterThan(path1!.length);
      }
    });
  });
});
