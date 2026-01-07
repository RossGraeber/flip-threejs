import {
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineSegments,
  LineBasicMaterial,
} from 'three';
import type { BufferGeometry as BufferGeometryType } from 'three';
import type { FlipEdgeNetwork } from '../algorithms/FlipEdgeNetwork';
import type { FlipOutStats, PathExportDataFull, FlipEdgeNetworkOptions } from '../types/PathData';
import { createVertexId } from '../types';

/**
 * Utility class for exporting and importing geodesic paths.
 * Provides methods to convert FlipEdgeNetwork data to various formats
 * including JSON, BufferGeometry, and complete Three.js objects.
 */
export class PathExport {
  // ============================================================
  // JSON Export/Import
  // ============================================================

  /**
   * Exports a FlipEdgeNetwork to a JSON-serializable object.
   * The exported data includes path vertices, lengths, polylines, and
   * waypoint information needed for reconstruction.
   *
   * @param network - The FlipEdgeNetwork to export
   * @param stats - Optional algorithm statistics to include
   * @returns JSON-serializable export data
   */
  static toJSON(network: FlipEdgeNetwork, stats?: FlipOutStats): PathExportDataFull {
    const polylines = network.getPathPolyline3D();

    const result: PathExportDataFull = {
      paths: network.paths.map((p) => p.getVertices().map((v) => v.id as number)),
      lengths: network.paths.map((p) => p.length),
      markedVertices: Array.from(network.markedVertices) as number[],
      polylines,
      waypoints: network.paths.map((p) => [p.startVertex.id as number, p.endVertex.id as number]),
    };

    if (stats) {
      result.stats = stats;
    }

    return result;
  }

  /**
   * Reconstructs a FlipEdgeNetwork from exported data and original mesh geometry.
   * This creates a new network with Dijkstra paths between the original waypoints.
   *
   * Note: The reconstructed network will have initial Dijkstra paths, not the
   * shortened geodesic paths. Call iterativeShorten() to re-compute geodesics.
   *
   * @param data - The exported path data
   * @param geometry - The original mesh geometry
   * @param FlipEdgeNetworkClass - The FlipEdgeNetwork class (to avoid circular imports)
   * @param options - Optional configuration options
   * @returns Reconstructed FlipEdgeNetwork
   */
  static fromJSON(
    data: PathExportDataFull,
    geometry: BufferGeometryType,
    FlipEdgeNetworkClass: typeof FlipEdgeNetwork,
    options?: FlipEdgeNetworkOptions
  ): FlipEdgeNetwork {
    // Handle empty paths case
    if (data.waypoints.length === 0) {
      return FlipEdgeNetworkClass.fromBufferGeometry(geometry, options);
    }

    // Flatten all waypoints into single array for piecewise path
    const allWaypoints: ReturnType<typeof createVertexId>[] = [];

    for (const pathWaypoints of data.waypoints) {
      if (allWaypoints.length === 0) {
        // First path: add all waypoints
        for (const id of pathWaypoints) {
          allWaypoints.push(createVertexId(id));
        }
      } else {
        // Subsequent paths: skip first waypoint (it's the end of previous path)
        for (let i = 1; i < pathWaypoints.length; i++) {
          allWaypoints.push(createVertexId(pathWaypoints[i]!));
        }
      }
    }

    // Reconstruct using piecewise Dijkstra
    const network = FlipEdgeNetworkClass.fromPiecewiseDijkstraPath(
      geometry,
      allWaypoints,
      data.markedVertices.length > 0,
      options
    );

    // Re-add marked vertices that may not have been set by fromPiecewiseDijkstraPath
    for (const id of data.markedVertices) {
      network.markedVertices.add(createVertexId(id));
    }

    return network;
  }

  // ============================================================
  // BufferGeometry Export
  // ============================================================

  /**
   * Exports paths as a BufferGeometry suitable for use with Line.
   * The geometry contains a continuous polyline for each path.
   *
   * Note: For multiple paths, use toLineSegments() instead to avoid
   * connecting separate paths.
   *
   * @param network - The FlipEdgeNetwork to export
   * @returns BufferGeometry with position attribute
   */
  static toLineGeometry(network: FlipEdgeNetwork): BufferGeometry {
    const polylines = network.getPathPolyline3D();
    const positions: number[] = [];

    for (const polyline of polylines) {
      for (const point of polyline) {
        positions.push(point.x, point.y, point.z);
      }
    }

    const geometry = new BufferGeometry();
    if (positions.length > 0) {
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    }
    return geometry;
  }

  /**
   * Exports all mesh edges as a BufferGeometry for debugging.
   * Creates line segments for every edge in the triangulation.
   *
   * @param network - The FlipEdgeNetwork to export
   * @returns BufferGeometry with position attribute for LineSegments
   */
  static toDebugGeometry(network: FlipEdgeNetwork): BufferGeometry {
    const edgePolylines = network.getAllEdgePolyline3D();
    const positions: number[] = [];

    for (const edge of edgePolylines) {
      if (edge[0] && edge[1]) {
        positions.push(edge[0].x, edge[0].y, edge[0].z);
        positions.push(edge[1].x, edge[1].y, edge[1].z);
      }
    }

    const geometry = new BufferGeometry();
    if (positions.length > 0) {
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    }
    return geometry;
  }

  // ============================================================
  // Complete Three.js Objects
  // ============================================================

  /**
   * Creates a Line object for paths, ready to add to a Three.js scene.
   * Best for single continuous paths.
   *
   * @param network - The FlipEdgeNetwork to export
   * @param material - Optional material (defaults to green LineBasicMaterial)
   * @returns Three.js Line object
   */
  static toLine(network: FlipEdgeNetwork, material?: LineBasicMaterial): Line {
    const geometry = PathExport.toLineGeometry(network);
    return new Line(geometry, material ?? new LineBasicMaterial({ color: 0x00ff00 }));
  }

  /**
   * Creates LineSegments for paths, ready to add to a Three.js scene.
   * Renders each path segment separately, avoiding connections between paths.
   * Best for multiple paths or discontinuous visualization.
   *
   * @param network - The FlipEdgeNetwork to export
   * @param material - Optional material (defaults to green LineBasicMaterial)
   * @returns Three.js LineSegments object
   */
  static toLineSegments(network: FlipEdgeNetwork, material?: LineBasicMaterial): LineSegments {
    const polylines = network.getPathPolyline3D();
    const positions: number[] = [];

    for (const polyline of polylines) {
      for (let i = 0; i < polyline.length - 1; i++) {
        const p1 = polyline[i];
        const p2 = polyline[i + 1];
        if (p1 && p2) {
          positions.push(p1.x, p1.y, p1.z);
          positions.push(p2.x, p2.y, p2.z);
        }
      }
    }

    const geometry = new BufferGeometry();
    if (positions.length > 0) {
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    }

    return new LineSegments(geometry, material ?? new LineBasicMaterial({ color: 0x00ff00 }));
  }

  /**
   * Creates LineSegments for debug mesh visualization, ready to add to a scene.
   * Shows all edges in the triangulation.
   *
   * @param network - The FlipEdgeNetwork to export
   * @param material - Optional material (defaults to gray LineBasicMaterial)
   * @returns Three.js LineSegments object
   */
  static toDebugLineSegments(network: FlipEdgeNetwork, material?: LineBasicMaterial): LineSegments {
    const geometry = PathExport.toDebugGeometry(network);
    return new LineSegments(geometry, material ?? new LineBasicMaterial({ color: 0x888888 }));
  }
}
