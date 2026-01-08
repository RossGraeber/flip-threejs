/**
 * Geodesic Loop example: Computing a closed geodesic loop with mesh segmentation
 *
 * This example demonstrates:
 * 1. Creating a mesh (torus)
 * 2. Specifying edge waypoints that the loop should pass through
 * 3. Computing a closed geodesic loop
 * 4. Segmenting the mesh into inside/outside regions
 * 5. Extracting the result as 3D coordinates for visualization
 */

import * as THREE from 'three';
import { GeodesicLoopNetwork, IntrinsicTriangulation, FaceRegion } from '../src/index';

/**
 * Creates an indexed torus geometry.
 * The torus is a good test case because it has non-trivial topology.
 */
function createIndexedTorus(
  radius: number,
  tube: number,
  radialSegments: number,
  tubularSegments: number
): THREE.BufferGeometry {
  const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
  return toIndexedGeometry(geometry);
}

/**
 * Converts a geometry to indexed format by merging duplicate vertices.
 */
function toIndexedGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const positionAttr = geometry.getAttribute('position');
  if (!positionAttr) {
    throw new Error('Geometry must have position attribute');
  }

  const positions = positionAttr.array as Float32Array;
  const vertexCount = positions.length / 3;

  const vertexMap = new Map<string, number>();
  const uniquePositions: number[] = [];
  const epsilon = 1e-6;

  const vertexRemap: number[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3]!;
    const y = positions[i * 3 + 1]!;
    const z = positions[i * 3 + 2]!;

    const key = `${Math.round(x / epsilon)},${Math.round(y / epsilon)},${Math.round(z / epsilon)}`;

    if (vertexMap.has(key)) {
      vertexRemap.push(vertexMap.get(key)!);
    } else {
      const newIndex = uniquePositions.length / 3;
      vertexMap.set(key, newIndex);
      uniquePositions.push(x, y, z);
      vertexRemap.push(newIndex);
    }
  }

  const newIndices: number[] = [];
  if (geometry.index !== null) {
    const oldIndices = geometry.index.array;
    for (let i = 0; i < oldIndices.length; i++) {
      newIndices.push(vertexRemap[oldIndices[i]!]!);
    }
  } else {
    for (let i = 0; i < vertexRemap.length; i++) {
      newIndices.push(vertexRemap[i]!);
    }
  }

  const indexedGeometry = new THREE.BufferGeometry();
  indexedGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(uniquePositions), 3)
  );
  indexedGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(newIndices), 1));

  return indexedGeometry;
}

/**
 * Main example function
 */
function main() {
  console.log('=== Geodesic Loop Example ===\n');

  // Step 1: Create a test mesh (torus)
  console.log('Step 1: Creating torus mesh...');
  const geometry = createIndexedTorus(1.0, 0.4, 16, 32);

  const positionAttribute = geometry.getAttribute('position');
  const numVertices = positionAttribute.count;
  const numFaces = geometry.index ? geometry.index.count / 3 : numVertices / 3;

  console.log(`  Vertices: ${numVertices}`);
  console.log(`  Faces: ${numFaces}`);
  console.log();

  // Step 2: Create triangulation and get edge count
  console.log('Step 2: Analyzing mesh edges...');
  const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);
  const edges = triangulation.getEdges();
  console.log(`  Total edges: ${edges.length}`);
  console.log();

  // Step 3: Choose waypoint edges spread around the mesh
  // We'll pick edges that are roughly evenly distributed
  const waypointIndices = [
    0,
    Math.floor(edges.length / 4),
    Math.floor(edges.length / 2),
    Math.floor((3 * edges.length) / 4),
  ];

  console.log('Step 3: Selecting waypoint edges...');
  console.log(`  Waypoint edge indices: [${waypointIndices.join(', ')}]`);
  console.log();

  // Step 4: Create and compute geodesic loop
  console.log('Step 4: Computing geodesic loop...');
  const network = GeodesicLoopNetwork.fromEdgeWaypoints(geometry, waypointIndices, {
    optimizeOrder: true,
    verbose: true,
    maxIterations: 200,
  });

  const result = network.compute();
  console.log();

  // Step 5: Display results
  console.log('=== Loop Results ===');
  console.log(`  Loop edges: ${result.loop.edges.length}`);
  console.log(`  Initial length: ${result.stats.initialLength.toFixed(6)}`);
  console.log(`  Final length: ${result.stats.finalLength.toFixed(6)}`);
  console.log(`  Iterations: ${result.stats.iterations}`);
  console.log(`  Execution time: ${result.stats.executionTime.toFixed(2)} ms`);
  console.log();

  // Step 6: Display segmentation results
  console.log('=== Segmentation Results ===');
  console.log(`  Inside faces: ${result.segmentation.insideFaces.length}`);
  console.log(`  Outside faces: ${result.segmentation.outsideFaces.length}`);
  console.log(`  Boundary faces: ${result.segmentation.boundaryFaces.length}`);
  console.log(`  Inside area: ${result.segmentation.insideArea.toFixed(4)}`);
  console.log(`  Outside area: ${result.segmentation.outsideArea.toFixed(4)}`);
  console.log();

  // Verify all faces are accounted for
  const totalSegmented =
    result.segmentation.insideFaces.length +
    result.segmentation.outsideFaces.length +
    result.segmentation.boundaryFaces.length;
  console.log(`  Total segmented: ${totalSegmented} / ${numFaces} faces`);
  console.log();

  // Step 7: Get loop as 3D coordinates
  const polyline = network.getLoopPolyline3D();

  console.log('Step 7: Loop coordinates (first 5 points):');
  polyline.slice(0, 5).forEach((point, i) => {
    console.log(
      `  Point ${i}: (${point.x.toFixed(3)}, ${point.y.toFixed(3)}, ${point.z.toFixed(3)})`
    );
  });
  if (polyline.length > 5) {
    console.log(`  ... and ${polyline.length - 5} more points`);
  }
  console.log();

  // Step 8: Verify loop is closed
  if (polyline.length >= 2) {
    const first = polyline[0]!;
    const last = polyline[polyline.length - 1]!;
    const distance = Math.sqrt(
      Math.pow(first.x - last.x, 2) + Math.pow(first.y - last.y, 2) + Math.pow(first.z - last.z, 2)
    );
    console.log(`Step 8: Verifying loop closure...`);
    console.log(`  Distance between first and last point: ${distance.toFixed(8)}`);
    console.log(`  Loop is closed: ${distance < 1e-5 ? 'YES ✓' : 'NO ✗'}`);
    console.log();
  }

  // For visualization: you could render the loop with Three.js
  // Example (pseudo-code):
  //
  // const loopPoints = polyline.map(p => new THREE.Vector3(p.x, p.y, p.z));
  // const loopGeometry = new THREE.BufferGeometry().setFromPoints(loopPoints);
  // const loopMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
  // const loopLine = new THREE.LineLoop(loopGeometry, loopMaterial);
  // scene.add(loopLine);
  //
  // // Color faces by region
  // for (const face of result.segmentation.insideFaces) {
  //   // Color face red
  // }
  // for (const face of result.segmentation.outsideFaces) {
  //   // Color face blue
  // }

  console.log('=== Example Complete ===');
}

// Run the example
main();
