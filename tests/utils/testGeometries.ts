import * as THREE from 'three';

/**
 * Creates an indexed icosahedron geometry for testing.
 * Three.js geometries need to be converted to indexed format for IntrinsicTriangulation.
 */
export function createIndexedIcosahedron(
  radius: number = 1,
  detail: number = 0
): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  return toIndexedGeometry(geometry);
}

/**
 * Creates an indexed sphere geometry for testing.
 */
export function createIndexedSphere(
  radius: number = 1,
  widthSegments: number = 16,
  heightSegments: number = 8
): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  return toIndexedGeometry(geometry);
}

/**
 * Creates an indexed box geometry for testing.
 */
export function createIndexedBox(
  width: number = 1,
  height: number = 1,
  depth: number = 1,
  widthSegments: number = 2,
  heightSegments: number = 2,
  depthSegments: number = 2
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(
    width,
    height,
    depth,
    widthSegments,
    heightSegments,
    depthSegments
  );
  return toIndexedGeometry(geometry);
}

/**
 * Creates an indexed torus geometry for testing.
 */
export function createIndexedTorus(
  radius: number = 1,
  tube: number = 0.4,
  radialSegments: number = 8,
  tubularSegments: number = 12
): THREE.BufferGeometry {
  const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
  return toIndexedGeometry(geometry);
}

/**
 * Converts a geometry to indexed format by merging duplicate vertices.
 * This is necessary because many Three.js geometries don't share vertices
 * between faces (like BoxGeometry) even when indexed.
 */
export function toIndexedGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const positionAttr = geometry.getAttribute('position');
  if (!positionAttr) {
    throw new Error('Geometry must have position attribute');
  }

  const positions = positionAttr.array as Float32Array;
  const vertexCount = positions.length / 3;

  // Map to track unique vertices
  const vertexMap = new Map<string, number>();
  const uniquePositions: number[] = [];

  const epsilon = 1e-6;

  // Build map of unique vertex positions
  const vertexRemap: number[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3]!;
    const y = positions[i * 3 + 1]!;
    const z = positions[i * 3 + 2]!;

    // Create a key that handles floating point comparison
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

  // Build new index array
  const newIndices: number[] = [];
  if (geometry.index !== null) {
    // Remap existing indices
    const oldIndices = geometry.index.array;
    for (let i = 0; i < oldIndices.length; i++) {
      newIndices.push(vertexRemap[oldIndices[i]!]!);
    }
  } else {
    // Non-indexed geometry - use vertex remap directly
    for (let i = 0; i < vertexRemap.length; i++) {
      newIndices.push(vertexRemap[i]!);
    }
  }

  // Create new indexed geometry
  const indexedGeometry = new THREE.BufferGeometry();
  indexedGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(uniquePositions), 3)
  );
  indexedGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(newIndices), 1));

  return indexedGeometry;
}

/**
 * Creates a simple triangle geometry (already indexed).
 */
export function createTriangleGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0.5, 1, 0]);
  const indices = new Uint32Array([0, 1, 2]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  return geometry;
}

/**
 * Creates a two-triangle quad geometry (already indexed).
 */
export function createQuadGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]);
  const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  return geometry;
}

/**
 * Creates two disconnected triangles (for testing unreachable paths).
 */
export function createDisconnectedTriangles(): THREE.BufferGeometry {
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

  return geometry;
}

/**
 * Creates a mesh with boundary (open surface).
 */
export function createOpenMesh(): THREE.BufferGeometry {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0.5, 1, 0, 1.5, 1, 0]);
  const indices = new Uint32Array([0, 1, 2, 1, 3, 2]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  return geometry;
}
