# FlipOut Algorithm Examples

This directory contains usage examples for the flip-threejs library, demonstrating how to compute geodesic paths and loops on triangle meshes using the FlipOut algorithm.

## Examples

### 1. Simple Geodesic ([simple-geodesic.ts](./simple-geodesic.ts))

**Basic geodesic path computation between two vertices.**

This example shows:
- Creating a mesh (icosphere)
- Computing an initial Dijkstra shortest path
- Using the FlipOut algorithm to refine it into a true geodesic
- Extracting the result as 3D coordinates

**Key concepts:**
- `FlipEdgeNetwork.fromDijkstraPath()` - Simple factory method
- `network.iterativeShorten()` - Main FlipOut algorithm
- `network.getPathPolyline3D()` - Get 3D coordinates for visualization

### 2. Multi-Waypoint Paths ([multi-waypoint.ts](./multi-waypoint.ts))

**Computing geodesic paths through multiple waypoints.**

This example demonstrates:
- Creating piecewise geodesic paths
- Working with multiple path segments
- Manual construction with DijkstraShortestPath
- Marked vertices for Bezier curve support

**Key concepts:**
- `FlipEdgeNetwork.fromPiecewiseDijkstraPath()` - Multiple waypoints
- `DijkstraShortestPath.computePath()` - Manual path computation
- Marked vertices for interior waypoints

### 3. Geodesic Loop ([geodesic-loop.ts](./geodesic-loop.ts))

**Computing a closed geodesic loop with mesh segmentation.**

This example demonstrates:
- Creating a mesh (torus)
- Specifying edge waypoints that the loop should pass through
- Automatic edge ordering optimization (TSP-like)
- Computing a closed geodesic loop
- Segmenting the mesh into inside/outside regions

**Key concepts:**
- `GeodesicLoopNetwork.fromEdgeWaypoints()` - Create loop from edge indices
- `network.compute()` - Compute loop with ordering, shortening, and segmentation
- `result.segmentation` - Access inside/outside face regions
- `network.getLoopPolyline3D()` - Get 3D coordinates for visualization

## Running the Examples

### Prerequisites

```bash
npm install
npm run build
```

### Using ts-node

```bash
npx ts-node examples/simple-geodesic.ts
npx ts-node examples/multi-waypoint.ts
npx ts-node examples/geodesic-loop.ts
```

### Compiling and Running

```bash
# Compile TypeScript
npx tsc examples/simple-geodesic.ts --outDir examples/dist

# Run compiled JavaScript
node examples/dist/simple-geodesic.js
```

## Understanding the Output

### Geodesic Criteria

A path is geodesic when:
1. **Angle test**: At every interior vertex, the path angle ≥ π (180°)
2. **Length test**: The path length is locally minimal (cannot be shortened by flipping edges)

The FlipOut algorithm iteratively flips edges until both criteria are satisfied.

### Typical Output

```
=== FlipOut Geodesic Example ===

Step 1: Creating icosphere mesh...
  Vertices: 162
  Faces: 320

Step 2: Computing geodesic from vertex 0 to vertex 81...

Step 3: Computing initial Dijkstra shortest path...
  Initial path length: 3.141593

Step 4: Running FlipOut algorithm...
[FlipEdgeNetwork] Starting iterative shortening (max: 100, threshold: 1e-10)
[FlipEdgeNetwork] Initial length: 3.141593
[FlipEdgeNetwork] Iteration 0: Flexible joint at vertex 42
[FlipEdgeNetwork] FlipOut at vertex 42: 2 edges in wedge
[FlipEdgeNetwork] Flipped 2 edges
...
[FlipEdgeNetwork] No flexible joints found - path is geodesic!
[FlipEdgeNetwork] Completed after 15 iterations. Final length: 3.141592

=== Results ===
  Iterations: 15
  Initial length: 3.141593
  Final length: 3.141592
  Improvement: 0.00%

  Minimum angle at interior vertices: 3.141593 rad
  π (180°): 3.141593 rad
  Is geodesic: YES ✓
```

### What to Look For

1. **Convergence**: The algorithm should converge in a reasonable number of iterations (typically < 100)
2. **Length decrease**: The path length should decrease or stay the same (never increase)
3. **Geodesic verification**: The final minimum angle should be ≥ π
4. **On a sphere**: Great circle paths have length = π × diameter (for a unit sphere, this is ≈ 3.14159)

### Geodesic Loop Output

For the geodesic loop example, you'll see additional output:

```
=== Geodesic Loop Example ===

Step 1: Creating torus mesh...
  Vertices: 512
  Faces: 1024

Step 2: Analyzing mesh edges...
  Total edges: 1536

Step 3: Selecting waypoint edges...
  Waypoint edge indices: [0, 384, 768, 1152]

Step 4: Computing geodesic loop...
Starting loop computation with 4 input edges
Ordering optimized in 45.23ms
Waypoints: 9
Skipped edges: 0
Building initial loop from 9 waypoints
Initial loop: 24 edges, length: 8.234567
Starting loop shortening
Iteration 0: flexible joint at vertex 42, flipping wedge
...
Loop shortening complete: 18 edges, length: 7.891234
Computing mesh segmentation
Segmentation: 412 inside, 588 outside

=== Loop Results ===
  Loop edges: 18
  Initial length: 8.234567
  Final length: 7.891234
  Iterations: 12
  Execution time: 156.78 ms

=== Segmentation Results ===
  Inside faces: 412
  Outside faces: 588
  Boundary faces: 24
  Inside area: 2.5133
  Outside area: 4.1888
```

## Next Steps

After running these examples, you can:

1. **Visualize**: Use Three.js to render the geodesic paths
2. **Experiment**: Try different meshes (torus, bunny, etc.)
3. **Optimize**: Adjust algorithm parameters for your use case
4. **Extend**: Add Bezier curve subdivision (coming soon)

## Visualization with Three.js

Here's a minimal example of rendering a geodesic path:

```typescript
import * as THREE from 'three';
import { FlipEdgeNetwork, createVertexId } from 'flip-threejs';

// Create scene, camera, renderer (standard Three.js setup)
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

// Compute geodesic
const geometry = new THREE.IcosahedronGeometry(1.0, 2);
const network = FlipEdgeNetwork.fromDijkstraPath(
  geometry,
  createVertexId(0),
  createVertexId(40)
);
network.iterativeShorten();

// Render mesh
const mesh = new THREE.Mesh(
  geometry,
  new THREE.MeshBasicMaterial({ color: 0x44aa88, wireframe: true })
);
scene.add(mesh);

// Render geodesic path
const pathPoints = network.getPathPolyline3D()[0]!.map(
  (p) => new THREE.Vector3(p.x, p.y, p.z)
);
const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
const pathMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 });
const pathLine = new THREE.Line(pathGeometry, pathMaterial);
scene.add(pathLine);

// Position camera and render
camera.position.z = 3;
renderer.setAnimationLoop(() => {
  mesh.rotation.x += 0.005;
  mesh.rotation.y += 0.01;
  pathLine.rotation.copy(mesh.rotation);
  renderer.render(scene, camera);
});
```

### Visualizing Geodesic Loops with Segmentation

Here's how to render a geodesic loop with colored face regions:

```typescript
import * as THREE from 'three';
import { GeodesicLoopNetwork, IntrinsicTriangulation } from 'flip-threejs';

// Create scene, camera, renderer (standard Three.js setup)
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

// Create torus geometry
const geometry = new THREE.TorusGeometry(1, 0.4, 16, 32);

// Compute geodesic loop
const waypointIndices = [0, 100, 200, 300];
const network = GeodesicLoopNetwork.fromEdgeWaypoints(geometry, waypointIndices, {
  optimizeOrder: true,
});
const result = network.compute();

// Render mesh with colored faces
const colors = new Float32Array(geometry.attributes.position.count * 3);
const triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);
const faces = triangulation.getFaces();

// Color faces by region (simplified - real implementation would map face indices)
// Inside = red, Outside = blue
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
const mesh = new THREE.Mesh(
  geometry,
  new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
);
scene.add(mesh);

// Render geodesic loop
const loopPoints = network.getLoopPolyline3D().map(
  (p) => new THREE.Vector3(p.x, p.y, p.z)
);
const loopGeometry = new THREE.BufferGeometry().setFromPoints(loopPoints);
const loopMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
const loopLine = new THREE.LineLoop(loopGeometry, loopMaterial);
scene.add(loopLine);

// Position camera and render
camera.position.z = 3;
renderer.setAnimationLoop(() => {
  mesh.rotation.y += 0.01;
  loopLine.rotation.copy(mesh.rotation);
  renderer.render(scene, camera);
});
```

## Troubleshooting

### "No path exists"
- Make sure source and target vertices are connected
- Check that vertex IDs are valid (< numVertices)

### Slow convergence
- Try increasing `maxIterations`
- For very coarse meshes, consider increasing `convergenceThreshold`

### Path doesn't look geodesic
- Verify the mesh has good triangle quality
- Check the final angle at interior vertices
- Consider using Delaunay refinement (coming soon)

### Loop issues

**"A geodesic loop must have at least 3 edges"**
- Provide at least 2-3 edge waypoints

**Loop doesn't close properly**
- Ensure the mesh is manifold (no holes or boundaries)
- Try different waypoint edges

**Segmentation looks wrong**
- The inside/outside determination depends on loop orientation
- Try swapping the interpretation if needed

## Additional Resources

- [FlipOut Paper](https://www.cs.cmu.edu/~kmcrane/Projects/FlipOut/) - Original SIGGRAPH Asia 2020 paper
- [API Documentation](../docs/api.md) - Full API reference
- [Algorithm Overview](../docs/algorithm.md) - Detailed explanation of the algorithm
