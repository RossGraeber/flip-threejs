# flip-threejs

> Compute exact geodesic paths on triangle meshes using the FlipOut algorithm

[![npm version](https://img.shields.io/npm/v/flip-threejs.svg)](https://www.npmjs.com/package/flip-threejs)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)

A TypeScript library implementing the **FlipOut algorithm** for computing geodesic paths on triangle meshes. Based on the SIGGRAPH Asia 2020 paper ["You Can Find Geodesic Paths in Triangle Meshes by Just Flipping Edges"](https://nmwsharp.com/research/flip-geodesics/) by Nicholas Sharp and Keenan Crane.

## Features

- **Exact Geodesic Computation**: Find locally shortest paths on triangle meshes
- **Three.js Integration**: Seamless integration with Three.js BufferGeometry
- **Intrinsic Triangulation**: Work with geodesics without modifying the input mesh
- **Multiple Path Types**: Support for paths, loops, and curve networks
- **Geodesic Bezier Curves**: Construct smooth curves on surfaces
- **TypeScript Native**: Full type safety with comprehensive type definitions
- **Zero Runtime Dependencies**: Only Three.js as a peer dependency

## Installation

```bash
npm install flip-threejs three
```

```bash
yarn add flip-threejs three
```

```bash
pnpm add flip-threejs three
```

## Quick Start

```typescript
import * as THREE from 'three';
import { FlipEdgeNetwork, createVertexId } from 'flip-threejs';

// Create or load a Three.js mesh
const geometry = new THREE.IcosahedronGeometry(1, 2);

// Compute geodesic path between two vertices
const network = FlipEdgeNetwork.fromDijkstraPath(
  geometry,
  createVertexId(0),
  createVertexId(40)
);

// Shorten to exact geodesic
network.iterativeShorten();

// Get path as 3D points for visualization
const pathPoints = network.getPathPolyline3D()[0];

// Create a line to visualize the geodesic
const points = pathPoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
const pathGeometry = new THREE.BufferGeometry().setFromPoints(points);
const pathLine = new THREE.Line(
  pathGeometry,
  new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 })
);
scene.add(pathLine);
```

## What is the FlipOut Algorithm?

The FlipOut algorithm finds geodesics (locally shortest paths) on polyhedral surfaces by iteratively flipping edges in an intrinsic triangulation. Unlike traditional approaches:

- **Intrinsic**: Works with edge lengths, not 3D coordinates
- **Exact**: Produces mathematically exact geodesics (not approximations)
- **Fast**: Typically completes in milliseconds, even for complex meshes
- **Topology-Preserving**: Guarantees non-crossing paths
- **Conforming Triangulation**: Produces a triangulation containing the geodesic as edges

The algorithm starts with an initial edge path (e.g., from Dijkstra's algorithm) and progressively straightens it by flipping edges around vertices where the path is not yet locally shortest.

## API Overview

### Construction

```typescript
import { createVertexId } from 'flip-threejs';

// From Dijkstra shortest path
const network = FlipEdgeNetwork.fromDijkstraPath(
  geometry,
  createVertexId(0),
  createVertexId(100)
);

// From multiple waypoints
const waypoints = [0, 25, 50, 75, 100].map(createVertexId);
const network = FlipEdgeNetwork.fromPiecewiseDijkstraPath(
  geometry,
  waypoints,
  true // mark interior vertices for Bezier curves
);

// From custom configuration
const network = new FlipEdgeNetwork(triangulation, paths, markedVertices, {
  maxIterations: 1000,
  convergenceThreshold: 1e-10,
  verbose: true
});
```

### Path Shortening

```typescript
// Shorten to geodesic with default settings
network.iterativeShorten();

// With iteration limit and convergence threshold
network.iterativeShorten(1000, 1e-6);
```

### Output

```typescript
// Get paths as surface points (face + barycentric coordinates)
const surfacePoints = network.getPathPolyline();

// Get paths as 3D coordinates
const points3D = network.getPathPolyline3D();

// Get all edges in the intrinsic triangulation
const allEdges = network.getAllEdgePolyline3D();
```

### Export & Visualization

```typescript
import { PathExport, FlipEdgeNetwork } from 'flip-threejs';

// Export to JSON (for saving/serialization)
const data = PathExport.toJSON(network);
const json = JSON.stringify(data);

// Reconstruct from JSON
const restored = PathExport.fromJSON(JSON.parse(json), geometry, FlipEdgeNetwork);

// Create Three.js visualization objects
const pathLine = PathExport.toLineSegments(network); // Path as LineSegments
const meshWireframe = PathExport.toDebugLineSegments(network); // All edges

// Or get raw BufferGeometry for custom materials
const pathGeometry = PathExport.toLineGeometry(network);
const debugGeometry = PathExport.toDebugGeometry(network);
```

### Advanced Features

```typescript
import { BezierSubdivision } from 'flip-threejs';

// Geodesic Bezier curves (requires marked control points)
BezierSubdivision.subdivide(network, 4); // 4 rounds of subdivision

// Query methods
const length = network.getLength();
const minAngle = network.minAngleIsotopy();
const isInPath = network.edgeInPath(edge);
const isGeodesic = network.findFlexibleJoint() === null;
```

## Use Cases

- **Texture Seam Straightening**: Smooth jagged UV seams
- **Surface Cutting**: Generate clean cut paths for mesh processing
- **Geodesic Sampling**: Sample points along shortest paths
- **Mesh Segmentation**: Create smooth region boundaries
- **Path Planning**: Navigate on complex surfaces
- **Computational Fabrication**: Design developable surfaces

## Algorithm Details

### How It Works

1. **Input**: Start with an edge path on the mesh (not necessarily geodesic)
2. **Find Flexible Joint**: Locate an interior vertex where the path angle is < π
3. **FlipOut**: Flip edges in the "wedge" around this vertex to straighten the path
4. **Repeat**: Continue until all interior vertices have angle ≥ π (locally shortest)

### Key Concepts

- **Intrinsic Triangulation**: A triangulation defined by edge lengths, not 3D positions
- **Signpost Data**: Encodes intrinsic geometry to trace paths across the mesh
- **Flexible Joint**: An interior path vertex that can be shortened
- **Wedge**: The set of triangles between incoming and outgoing path edges at a vertex

## Performance

The algorithm is highly efficient:

- **Typical Runtime**: Few milliseconds for standard meshes
- **Large Meshes**: ~10-50ms for meshes with millions of triangles
- **Scaling**: Approximately O(m^1.5) edge flips, where m is path length
- **Memory**: Compact intrinsic representation, minimal overhead

## Examples

See the [examples/](examples/) directory for complete working examples:

- **[simple-geodesic.ts](examples/simple-geodesic.ts)**: Basic geodesic path between two vertices
- **[multi-waypoint.ts](examples/multi-waypoint.ts)**: Piecewise paths through multiple waypoints
- **[examples/README.md](examples/README.md)**: Comprehensive guide with visualization tips

Run the examples:

```bash
npx ts-node examples/simple-geodesic.ts
npx ts-node examples/multi-waypoint.ts
```

## Documentation

- **[Implementation Status](docs/implementation-status.md)**: Detailed status of all features
- **[Examples README](examples/README.md)**: Usage guide with visualization examples
- API Reference: Coming soon
- Algorithm Overview: Coming soon

## Research & References

This implementation is based on:

**Paper**: Nicholas Sharp and Keenan Crane. 2020. "You Can Find Geodesic Paths in Triangle Meshes by Just Flipping Edges." *ACM Trans. Graph.* 39, 6, Article 249.

- [Project Page](https://nmwsharp.com/research/flip-geodesics/)
- [Research Paper (PDF)](https://nmwsharp.com/media/papers/flip-geodesics/flip_geodesics.pdf)
- [C++ Reference Implementation](https://geometry-central.net/surface/algorithms/flip_geodesics/)
- [Python Reference Implementation](https://github.com/nmwsharp/potpourri3d#mesh-geodesic-paths)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build library
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## Requirements

- **Node.js**: >=18.0.0
- **Three.js**: >=0.160.0 (peer dependency)

## Browser Support

This library works in all modern browsers that support ES2020:

- Chrome/Edge 80+
- Firefox 74+
- Safari 13.1+

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- **Nicholas Sharp** and **Keenan Crane** for the FlipOut algorithm and research
- **geometry-central** team for the reference C++ implementation
- **Three.js** community for the excellent 3D framework

## Citation

If you use this library in academic work, please cite the original paper:

```bibtex
@article{sharp2020flipout,
  title={You Can Find Geodesic Paths in Triangle Meshes by Just Flipping Edges},
  author={Sharp, Nicholas and Crane, Keenan},
  journal={ACM Transactions on Graphics (TOG)},
  volume={39},
  number={6},
  pages={1--15},
  year={2020},
  publisher={ACM New York, NY, USA}
}
```

## Support

- [GitHub Issues](https://github.com/rossgriswold/flip-threejs/issues)
- [Discussions](https://github.com/rossgriswold/flip-threejs/discussions)

---

Built with TypeScript and Three.js
