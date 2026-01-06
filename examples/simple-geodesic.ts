/**
 * Simple example: Computing a geodesic path on a sphere
 *
 * This example demonstrates:
 * 1. Creating a mesh (icosphere)
 * 2. Computing an initial Dijkstra path between two vertices
 * 3. Using FlipOut to shorten the path until it becomes geodesic
 * 4. Extracting the result as 3D coordinates for visualization
 */

import * as THREE from 'three';
import { FlipEdgeNetwork, createVertexId } from '../src/index';

/**
 * Creates an icosphere mesh for testing geodesic paths.
 * The icosphere is a good test case because geodesics on a sphere
 * are great circles (arcs).
 */
function createIcosphere(radius: number, subdivisions: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(radius, subdivisions);
  return geometry;
}

/**
 * Main example function
 */
function main() {
  console.log('=== FlipOut Geodesic Example ===\n');

  // Step 1: Create a test mesh (icosphere with radius 1, 2 subdivisions)
  console.log('Step 1: Creating icosphere mesh...');
  const geometry = createIcosphere(1.0, 2);

  // Get some mesh statistics
  const positionAttribute = geometry.getAttribute('position');
  const numVertices = positionAttribute.count;
  const numFaces = geometry.index ? geometry.index.count / 3 : numVertices / 3;

  console.log(`  Vertices: ${numVertices}`);
  console.log(`  Faces: ${numFaces}`);
  console.log();

  // Step 2: Choose source and target vertices
  // For a sphere, opposite vertices will give us a nice long geodesic
  const sourceId = createVertexId(0);
  const targetId = createVertexId(Math.floor(numVertices / 2));

  console.log(`Step 2: Computing geodesic from vertex ${sourceId} to vertex ${targetId}...`);
  console.log();

  // Step 3: Create FlipEdgeNetwork with initial Dijkstra path
  console.log('Step 3: Computing initial Dijkstra shortest path...');
  const network = FlipEdgeNetwork.fromDijkstraPath(geometry, sourceId, targetId, {
    verbose: true, // Enable logging
    maxIterations: 100,
    convergenceThreshold: 1e-10,
  });

  const initialLength = network.getLength();
  console.log(`  Initial path length: ${initialLength.toFixed(6)}`);
  console.log();

  // Step 4: Run FlipOut algorithm to shorten path
  console.log('Step 4: Running FlipOut algorithm...');
  const iterations = network.iterativeShorten();

  const finalLength = network.getLength();
  const improvement = ((initialLength - finalLength) / initialLength) * 100;

  console.log();
  console.log('=== Results ===');
  console.log(`  Iterations: ${iterations}`);
  console.log(`  Initial length: ${initialLength.toFixed(6)}`);
  console.log(`  Final length: ${finalLength.toFixed(6)}`);
  console.log(`  Improvement: ${improvement.toFixed(2)}%`);
  console.log();

  // Step 5: Check if path is geodesic
  const minAngle = network.minAngleIsotopy();
  const isGeodesic = minAngle >= Math.PI - 1e-6;

  console.log(`  Minimum angle at interior vertices: ${minAngle.toFixed(6)} rad`);
  console.log(`  π (180°): ${Math.PI.toFixed(6)} rad`);
  console.log(`  Is geodesic: ${isGeodesic ? 'YES ✓' : 'NO ✗'}`);
  console.log();

  // Step 6: Get path as 3D coordinates
  const pathPolylines = network.getPathPolyline3D();

  console.log('Step 6: Path coordinates:');
  pathPolylines.forEach((polyline, pathIndex) => {
    console.log(`  Path ${pathIndex + 1}:`);
    polyline.forEach((point, i) => {
      console.log(
        `    Point ${i}: (${point.x.toFixed(3)}, ${point.y.toFixed(3)}, ${point.z.toFixed(3)})`
      );
    });
  });
  console.log();

  // For visualization: you could render the path with Three.js
  // Example (pseudo-code):
  //
  // const points = pathPolylines[0].map(p => new THREE.Vector3(p.x, p.y, p.z));
  // const pathGeometry = new THREE.BufferGeometry().setFromPoints(points);
  // const pathMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
  // const pathLine = new THREE.Line(pathGeometry, pathMaterial);
  // scene.add(pathLine);

  console.log('=== Example Complete ===');
}

// Run the example
main();
