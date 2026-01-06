# FlipOut Algorithm Examples

This directory contains usage examples for the flip-threejs library, demonstrating how to compute geodesic paths on triangle meshes using the FlipOut algorithm.

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

## Additional Resources

- [FlipOut Paper](https://www.cs.cmu.edu/~kmcrane/Projects/FlipOut/) - Original SIGGRAPH Asia 2020 paper
- [API Documentation](../docs/api.md) - Full API reference
- [Algorithm Overview](../docs/algorithm.md) - Detailed explanation of the algorithm
