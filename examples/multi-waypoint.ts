/**
 * Advanced example: Computing geodesic paths through multiple waypoints
 *
 * This example demonstrates:
 * 1. Creating paths that visit multiple vertices in order
 * 2. Computing piecewise geodesics
 * 3. Working with marked vertices (for future Bezier curve support)
 */

import * as THREE from 'three';
import { FlipEdgeNetwork, createVertexId, DijkstraShortestPath } from '../src/index';

/**
 * Creates an icosphere mesh
 */
function createIcosphere(radius: number, subdivisions: number): THREE.BufferGeometry {
  return new THREE.IcosahedronGeometry(radius, subdivisions);
}

/**
 * Main example function
 */
function main() {
  console.log('=== Multi-Waypoint Geodesic Example ===\n');

  // Create test mesh
  console.log('Creating icosphere mesh...');
  const geometry = createIcosphere(1.0, 3);

  const positionAttribute = geometry.getAttribute('position');
  const numVertices = positionAttribute.count;

  console.log(`  Vertices: ${numVertices}`);
  console.log();

  // Choose waypoints around the sphere
  // We'll create a path that visits 4 vertices
  const waypoints = [
    createVertexId(0),
    createVertexId(Math.floor(numVertices * 0.25)),
    createVertexId(Math.floor(numVertices * 0.5)),
    createVertexId(Math.floor(numVertices * 0.75)),
  ];

  console.log('Waypoints:', waypoints.join(' → '));
  console.log();

  // Method 1: Using fromPiecewiseDijkstraPath (simpler)
  console.log('Method 1: Using fromPiecewiseDijkstraPath...');
  const network = FlipEdgeNetwork.fromPiecewiseDijkstraPath(
    geometry,
    waypoints,
    true, // Mark interior waypoints (for Bezier curve support)
    { verbose: false, maxIterations: 100 }
  );

  console.log(`  Initial total length: ${network.getLength().toFixed(6)}`);
  console.log(`  Number of path segments: ${network.paths.length}`);
  console.log();

  // Shorten each segment
  console.log('Running FlipOut on all segments...');
  const iterations = network.iterativeShorten();

  console.log(`  Iterations: ${iterations}`);
  console.log(`  Final total length: ${network.getLength().toFixed(6)}`);
  console.log();

  // Get paths
  const pathPolylines = network.getPathPolyline3D();

  console.log('Path segments:');
  pathPolylines.forEach((polyline, i) => {
    console.log(`  Segment ${i + 1}: ${polyline.length} vertices`);

    // Calculate segment length
    let segmentLength = 0;
    for (let j = 0; j < polyline.length - 1; j++) {
      const p1 = polyline[j]!;
      const p2 = polyline[j + 1]!;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      segmentLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    console.log(`    Euclidean length: ${segmentLength.toFixed(6)}`);
  });
  console.log();

  // Method 2: Manual construction (more control)
  console.log('Method 2: Manual construction with DijkstraShortestPath...');

  const triangulation = network.triangulation;
  const dijkstra = new DijkstraShortestPath(triangulation);

  // Compute individual segments
  const segments = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const source = waypoints[i];
    const target = waypoints[i + 1];

    if (!source || !target) continue;

    const path = dijkstra.computePath(source, target);
    if (path) {
      segments.push(path);
      console.log(`  Segment ${i + 1} (${source} → ${target}): ${path.length.toFixed(6)}`);
    }
  }

  const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);
  console.log(`  Total length: ${totalLength.toFixed(6)}`);
  console.log();

  // You can create a new network with these paths for further processing
  const customNetwork = new FlipEdgeNetwork(triangulation, segments, new Set(), {
    verbose: false,
  });

  console.log('Custom network created with', customNetwork.paths.length, 'segments');
  console.log();

  console.log('=== Example Complete ===');
}

// Run the example
main();
