import { describe, it, expect } from 'vitest';
import { BufferGeometry, Line, LineSegments, LineBasicMaterial } from 'three';
import { PathExport } from '../../../src/geometry/PathExport';
import { FlipEdgeNetwork } from '../../../src/algorithms/FlipEdgeNetwork';
import { createVertexId } from '../../../src/types';
import { createIndexedIcosahedron, createQuadGeometry } from '../../utils/testGeometries';
import type { PathExportDataFull } from '../../../src/types/PathData';

describe('PathExport', () => {
  describe('toJSON', () => {
    it('should export network with single path', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(5)
      );

      const data = PathExport.toJSON(network);

      expect(data.paths).toHaveLength(1);
      expect(data.lengths).toHaveLength(1);
      expect(data.polylines).toHaveLength(1);
      expect(data.waypoints).toHaveLength(1);
      expect(data.waypoints[0]).toHaveLength(2);
      expect(data.waypoints[0]![0]).toBe(0);
      expect(data.waypoints[0]![1]).toBe(5);
    });

    it('should export network with no paths', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromBufferGeometry(geometry);

      const data = PathExport.toJSON(network);

      expect(data.paths).toHaveLength(0);
      expect(data.lengths).toHaveLength(0);
      expect(data.polylines).toHaveLength(0);
      expect(data.waypoints).toHaveLength(0);
      expect(data.markedVertices).toHaveLength(0);
    });

    it('should export network with multiple paths', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromPiecewiseDijkstraPath(
        geometry,
        [createVertexId(0), createVertexId(3), createVertexId(6)],
        false
      );

      const data = PathExport.toJSON(network);

      expect(data.paths).toHaveLength(2);
      expect(data.lengths).toHaveLength(2);
      expect(data.polylines).toHaveLength(2);
      expect(data.waypoints).toHaveLength(2);
    });

    it('should export marked vertices', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromPiecewiseDijkstraPath(
        geometry,
        [createVertexId(0), createVertexId(3), createVertexId(6)],
        true // Mark interior waypoints
      );

      const data = PathExport.toJSON(network);

      expect(data.markedVertices).toContain(3);
    });

    it('should include stats when provided', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(5)
      );

      const stats = {
        iterations: 10,
        initialLength: 2.5,
        finalLength: 2.0,
        flipsPerformed: 15,
        executionTime: 100,
        converged: true,
      };

      const data = PathExport.toJSON(network, stats);

      expect(data.stats).toEqual(stats);
    });

    it('should export correct path vertex IDs', () => {
      const geometry = createQuadGeometry();
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(2)
      );

      const data = PathExport.toJSON(network);

      expect(data.paths[0]).toContain(0);
      expect(data.paths[0]).toContain(2);
    });
  });

  describe('fromJSON', () => {
    it('should reconstruct network from exported data', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const original = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(5)
      );

      const data = PathExport.toJSON(original);
      const reconstructed = PathExport.fromJSON(data, geometry, FlipEdgeNetwork);

      expect(reconstructed.paths).toHaveLength(1);
      expect(reconstructed.paths[0]!.startVertex.id).toBe(createVertexId(0));
      expect(reconstructed.paths[0]!.endVertex.id).toBe(createVertexId(5));
    });

    it('should reconstruct network with no paths', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const data: PathExportDataFull = {
        paths: [],
        lengths: [],
        markedVertices: [],
        polylines: [],
        waypoints: [],
      };

      const reconstructed = PathExport.fromJSON(data, geometry, FlipEdgeNetwork);

      expect(reconstructed.paths).toHaveLength(0);
    });

    it('should reconstruct network with multiple paths', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const original = FlipEdgeNetwork.fromPiecewiseDijkstraPath(
        geometry,
        [createVertexId(0), createVertexId(3), createVertexId(6)],
        false
      );

      const data = PathExport.toJSON(original);
      const reconstructed = PathExport.fromJSON(data, geometry, FlipEdgeNetwork);

      expect(reconstructed.paths).toHaveLength(2);
    });

    it('should restore marked vertices', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const original = FlipEdgeNetwork.fromPiecewiseDijkstraPath(
        geometry,
        [createVertexId(0), createVertexId(3), createVertexId(6)],
        true
      );

      const data = PathExport.toJSON(original);
      const reconstructed = PathExport.fromJSON(data, geometry, FlipEdgeNetwork);

      expect(reconstructed.markedVertices.has(createVertexId(3))).toBe(true);
    });

    it('should apply provided options', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const data: PathExportDataFull = {
        paths: [[0, 1, 5]],
        lengths: [1.5],
        markedVertices: [],
        polylines: [[{ x: 0, y: 0, z: 0 }]],
        waypoints: [[0, 5]],
      };

      const options = { maxIterations: 500, verbose: true };
      const reconstructed = PathExport.fromJSON(data, geometry, FlipEdgeNetwork, options);

      // Network should be created (options are internal)
      expect(reconstructed).toBeDefined();
      expect(reconstructed.paths).toHaveLength(1);
    });
  });

  describe('toLineGeometry', () => {
    it('should return BufferGeometry with position attribute', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(5)
      );

      const lineGeometry = PathExport.toLineGeometry(network);

      expect(lineGeometry).toBeInstanceOf(BufferGeometry);
      expect(lineGeometry.getAttribute('position')).toBeDefined();
    });

    it('should have correct number of vertices for path', () => {
      const geometry = createQuadGeometry();
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(2)
      );

      const lineGeometry = PathExport.toLineGeometry(network);
      const positions = lineGeometry.getAttribute('position');

      // Path should have at least 2 vertices (start and end)
      expect(positions.count).toBeGreaterThanOrEqual(2);
    });

    it('should return empty geometry for network with no paths', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromBufferGeometry(geometry);

      const lineGeometry = PathExport.toLineGeometry(network);

      expect(lineGeometry).toBeInstanceOf(BufferGeometry);
      // Position attribute may not exist for empty geometry
      const positions = lineGeometry.getAttribute('position');
      if (positions) {
        expect(positions.count).toBe(0);
      }
    });
  });

  describe('toDebugGeometry', () => {
    it('should return BufferGeometry with position attribute', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromBufferGeometry(geometry);

      const debugGeometry = PathExport.toDebugGeometry(network);

      expect(debugGeometry).toBeInstanceOf(BufferGeometry);
      expect(debugGeometry.getAttribute('position')).toBeDefined();
    });

    it('should export all mesh edges', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromBufferGeometry(geometry);

      const debugGeometry = PathExport.toDebugGeometry(network);
      const positions = debugGeometry.getAttribute('position');

      // Icosahedron has 30 edges, each edge = 2 vertices
      // So we expect 60 vertices in the debug geometry
      expect(positions).toBeDefined();
      expect(positions.count).toBe(60);
    });
  });

  describe('toLine', () => {
    it('should return Line object', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(5)
      );

      const line = PathExport.toLine(network);

      expect(line).toBeInstanceOf(Line);
      expect(line.geometry).toBeInstanceOf(BufferGeometry);
    });

    it('should use default material when not provided', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(5)
      );

      const line = PathExport.toLine(network);

      expect(line.material).toBeInstanceOf(LineBasicMaterial);
    });

    it('should use provided material', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(5)
      );

      const customMaterial = new LineBasicMaterial({ color: 0xff0000 });
      const line = PathExport.toLine(network, customMaterial);

      expect(line.material).toBe(customMaterial);
    });
  });

  describe('toLineSegments', () => {
    it('should return LineSegments object', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(5)
      );

      const segments = PathExport.toLineSegments(network);

      expect(segments).toBeInstanceOf(LineSegments);
      expect(segments.geometry).toBeInstanceOf(BufferGeometry);
    });

    it('should have correct vertex count for segments', () => {
      const geometry = createQuadGeometry();
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(2)
      );

      const segments = PathExport.toLineSegments(network);
      const positions = segments.geometry.getAttribute('position');

      // For LineSegments, each segment needs 2 vertices
      // A path with N vertices has N-1 segments, so 2*(N-1) vertices
      expect(positions.count % 2).toBe(0);
    });

    it('should use default material when not provided', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromDijkstraPath(
        geometry,
        createVertexId(0),
        createVertexId(5)
      );

      const segments = PathExport.toLineSegments(network);

      expect(segments.material).toBeInstanceOf(LineBasicMaterial);
    });
  });

  describe('toDebugLineSegments', () => {
    it('should return LineSegments object', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromBufferGeometry(geometry);

      const segments = PathExport.toDebugLineSegments(network);

      expect(segments).toBeInstanceOf(LineSegments);
    });

    it('should use gray material by default', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromBufferGeometry(geometry);

      const segments = PathExport.toDebugLineSegments(network);
      const material = segments.material as LineBasicMaterial;

      expect(material).toBeInstanceOf(LineBasicMaterial);
      expect(material.color.getHex()).toBe(0x888888);
    });

    it('should use provided material', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const network = FlipEdgeNetwork.fromBufferGeometry(geometry);

      const customMaterial = new LineBasicMaterial({ color: 0x0000ff });
      const segments = PathExport.toDebugLineSegments(network, customMaterial);

      expect(segments.material).toBe(customMaterial);
    });
  });

  describe('round-trip consistency', () => {
    it('should preserve path endpoints through export/import', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const sourceId = createVertexId(0);
      const targetId = createVertexId(8);

      const original = FlipEdgeNetwork.fromDijkstraPath(geometry, sourceId, targetId);
      const data = PathExport.toJSON(original);
      const reconstructed = PathExport.fromJSON(data, geometry, FlipEdgeNetwork);

      expect(reconstructed.paths[0]!.startVertex.id).toBe(sourceId);
      expect(reconstructed.paths[0]!.endVertex.id).toBe(targetId);
    });

    it('should preserve marked vertices through export/import', () => {
      const geometry = createIndexedIcosahedron(1, 0);
      const waypoints = [createVertexId(0), createVertexId(4), createVertexId(8)];

      const original = FlipEdgeNetwork.fromPiecewiseDijkstraPath(geometry, waypoints, true);
      const data = PathExport.toJSON(original);
      const reconstructed = PathExport.fromJSON(data, geometry, FlipEdgeNetwork);

      expect(reconstructed.markedVertices.size).toBe(original.markedVertices.size);
      for (const id of original.markedVertices) {
        expect(reconstructed.markedVertices.has(id)).toBe(true);
      }
    });
  });
});
