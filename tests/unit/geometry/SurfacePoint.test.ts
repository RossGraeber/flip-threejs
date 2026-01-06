import { describe, it, expect, beforeEach } from 'vitest';
import { SurfacePoint } from '../../../src/geometry/SurfacePoint';
import { IntrinsicTriangulation } from '../../../src/core/IntrinsicTriangulation';
import type { Face } from '../../../src/core/Face';
import type { Vertex } from '../../../src/core/Vertex';
import type { Edge } from '../../../src/core/Edge';
import { createIndexedIcosahedron } from '../../utils/testGeometries';

describe('SurfacePoint', () => {
  let triangulation: IntrinsicTriangulation;
  let face: Face;
  let vertices: Vertex[];
  let edges: Edge[];

  beforeEach(() => {
    const geometry = createIndexedIcosahedron(1, 0);
    triangulation = IntrinsicTriangulation.fromBufferGeometry(geometry);

    // Get a face to test with
    const facesArray = Array.from(triangulation.faces.values());
    face = facesArray[0]!;
    vertices = face.getVertices()!;
    edges = triangulation.getEdges();
  });

  describe('constructor', () => {
    it('should create a surface point with valid barycentric coordinates', () => {
      const point = new SurfacePoint(face, [0.5, 0.25, 0.25]);

      expect(point.face).toBe(face);
      expect(point.barycentricCoords[0]).toBe(0.5);
      expect(point.barycentricCoords[1]).toBe(0.25);
      expect(point.barycentricCoords[2]).toBe(0.25);
    });

    it('should accept barycentric coordinates at vertices', () => {
      const pointAtV0 = new SurfacePoint(face, [1, 0, 0]);
      const pointAtV1 = new SurfacePoint(face, [0, 1, 0]);
      const pointAtV2 = new SurfacePoint(face, [0, 0, 1]);

      expect(pointAtV0.barycentricCoords).toEqual([1, 0, 0]);
      expect(pointAtV1.barycentricCoords).toEqual([0, 1, 0]);
      expect(pointAtV2.barycentricCoords).toEqual([0, 0, 1]);
    });

    it('should accept barycentric coordinates at face center', () => {
      const center = new SurfacePoint(face, [1 / 3, 1 / 3, 1 / 3]);

      expect(center.barycentricCoords[0]).toBeCloseTo(1 / 3, 10);
      expect(center.barycentricCoords[1]).toBeCloseTo(1 / 3, 10);
      expect(center.barycentricCoords[2]).toBeCloseTo(1 / 3, 10);
    });
  });

  describe('toVector3', () => {
    it('should convert to 3D coordinates at vertex', () => {
      const v0 = vertices[0]!;
      const pointAtV0 = new SurfacePoint(face, [1, 0, 0]);

      const pos = pointAtV0.toVector3();

      expect(pos.x).toBeCloseTo(v0.position.x, 5);
      expect(pos.y).toBeCloseTo(v0.position.y, 5);
      expect(pos.z).toBeCloseTo(v0.position.z, 5);
    });

    it('should convert to 3D coordinates at face center', () => {
      const v0 = vertices[0]!;
      const v1 = vertices[1]!;
      const v2 = vertices[2]!;

      const center = SurfacePoint.fromFaceCenter(face);
      const pos = center.toVector3();

      // Face center should be average of vertex positions
      const expectedX = (v0.position.x + v1.position.x + v2.position.x) / 3;
      const expectedY = (v0.position.y + v1.position.y + v2.position.y) / 3;
      const expectedZ = (v0.position.z + v1.position.z + v2.position.z) / 3;

      expect(pos.x).toBeCloseTo(expectedX, 5);
      expect(pos.y).toBeCloseTo(expectedY, 5);
      expect(pos.z).toBeCloseTo(expectedZ, 5);
    });

    it('should convert to 3D coordinates at edge midpoint', () => {
      const v0 = vertices[0]!;
      const v1 = vertices[1]!;

      // Edge midpoint has coords [0.5, 0.5, 0]
      const edgeMidpoint = new SurfacePoint(face, [0.5, 0.5, 0]);
      const pos = edgeMidpoint.toVector3();

      const expectedX = (v0.position.x + v1.position.x) / 2;
      const expectedY = (v0.position.y + v1.position.y) / 2;
      const expectedZ = (v0.position.z + v1.position.z) / 2;

      expect(pos.x).toBeCloseTo(expectedX, 5);
      expect(pos.y).toBeCloseTo(expectedY, 5);
      expect(pos.z).toBeCloseTo(expectedZ, 5);
    });
  });

  describe('isOnEdge', () => {
    it('should return true when one barycentric coordinate is zero', () => {
      const onEdge1 = new SurfacePoint(face, [0.5, 0.5, 0]); // On edge opposite to v2
      const onEdge2 = new SurfacePoint(face, [0.5, 0, 0.5]); // On edge opposite to v1
      const onEdge3 = new SurfacePoint(face, [0, 0.5, 0.5]); // On edge opposite to v0

      expect(onEdge1.isOnEdge()).toBe(true);
      expect(onEdge2.isOnEdge()).toBe(true);
      expect(onEdge3.isOnEdge()).toBe(true);
    });

    it('should return false for interior point', () => {
      const interior = new SurfacePoint(face, [0.4, 0.3, 0.3]);

      expect(interior.isOnEdge()).toBe(false);
    });

    it('should return true for point on vertex (two coordinates zero)', () => {
      const atVertex = new SurfacePoint(face, [1, 0, 0]);

      // A vertex is technically on edges too (endpoint)
      expect(atVertex.isOnEdge()).toBe(true);
    });

    it('should respect tolerance parameter', () => {
      const nearEdge = new SurfacePoint(face, [0.5, 0.5, 1e-12]);

      expect(nearEdge.isOnEdge(1e-10)).toBe(true);
      expect(nearEdge.isOnEdge(1e-14)).toBe(false);
    });
  });

  describe('isOnVertex', () => {
    it('should return true when point is at a vertex', () => {
      const atV0 = new SurfacePoint(face, [1, 0, 0]);
      const atV1 = new SurfacePoint(face, [0, 1, 0]);
      const atV2 = new SurfacePoint(face, [0, 0, 1]);

      expect(atV0.isOnVertex()).toBe(true);
      expect(atV1.isOnVertex()).toBe(true);
      expect(atV2.isOnVertex()).toBe(true);
    });

    it('should return false for edge midpoint', () => {
      const edgeMidpoint = new SurfacePoint(face, [0.5, 0.5, 0]);

      expect(edgeMidpoint.isOnVertex()).toBe(false);
    });

    it('should return false for interior point', () => {
      const interior = new SurfacePoint(face, [0.4, 0.3, 0.3]);

      expect(interior.isOnVertex()).toBe(false);
    });

    it('should respect tolerance parameter', () => {
      const nearVertex = new SurfacePoint(face, [1 - 1e-12, 1e-12 / 2, 1e-12 / 2]);

      expect(nearVertex.isOnVertex(1e-10)).toBe(true);
      expect(nearVertex.isOnVertex(1e-14)).toBe(false);
    });
  });

  describe('getVertex', () => {
    it('should return vertex when point is on vertex', () => {
      const v0 = vertices[0]!;
      const atV0 = new SurfacePoint(face, [1, 0, 0]);

      const vertex = atV0.getVertex();

      expect(vertex).not.toBeNull();
      expect(vertex!.id).toBe(v0.id);
    });

    it('should return null when point is not on vertex', () => {
      const edgeMidpoint = new SurfacePoint(face, [0.5, 0.5, 0]);

      expect(edgeMidpoint.getVertex()).toBeNull();
    });

    it('should return correct vertex for each corner', () => {
      const v0 = vertices[0]!;
      const v1 = vertices[1]!;
      const v2 = vertices[2]!;

      const atV0 = new SurfacePoint(face, [1, 0, 0]);
      const atV1 = new SurfacePoint(face, [0, 1, 0]);
      const atV2 = new SurfacePoint(face, [0, 0, 1]);

      expect(atV0.getVertex()!.id).toBe(v0.id);
      expect(atV1.getVertex()!.id).toBe(v1.id);
      expect(atV2.getVertex()!.id).toBe(v2.id);
    });
  });

  describe('getEdge', () => {
    it('should return edge when point is on edge', () => {
      const onEdge = new SurfacePoint(face, [0.5, 0.5, 0]);

      const edge = onEdge.getEdge();

      expect(edge).not.toBeNull();
    });

    it('should return null when point is interior', () => {
      const interior = new SurfacePoint(face, [0.4, 0.3, 0.3]);

      expect(interior.getEdge()).toBeNull();
    });
  });

  describe('fromVertex', () => {
    it('should create surface point at vertex position', () => {
      const v0 = vertices[0]!;

      const point = SurfacePoint.fromVertex(v0, face);

      expect(point.face).toBe(face);
      expect(point.isOnVertex()).toBe(true);

      const vertex = point.getVertex();
      expect(vertex).not.toBeNull();
      expect(vertex!.id).toBe(v0.id);
    });

    it('should throw for vertex not in face', () => {
      // Find a vertex not in this face
      let otherVertex = null;
      const faceVertexIds = new Set(vertices.map((v) => v.id));

      for (const [id, v] of triangulation.vertices) {
        if (!faceVertexIds.has(id)) {
          otherVertex = v;
          break;
        }
      }

      if (otherVertex) {
        expect(() => {
          SurfacePoint.fromVertex(otherVertex!, face);
        }).toThrow('Vertex is not part of the specified face');
      }
    });
  });

  describe('fromEdgeMidpoint', () => {
    it('should create surface point at edge midpoint', () => {
      const halfedges = face.getHalfedges();
      const edge = halfedges![0]!.edge;

      const point = SurfacePoint.fromEdgeMidpoint(edge, face);

      expect(point.face).toBe(face);
      expect(point.isOnEdge()).toBe(true);
    });

    it('should throw for edge not in face', () => {
      // Find an edge not in this face
      const faceEdges = face.getHalfedges()!.map((he) => he.edge.id);
      let otherEdge = null;

      for (const edge of edges) {
        if (!faceEdges.includes(edge.id)) {
          otherEdge = edge;
          break;
        }
      }

      if (otherEdge) {
        expect(() => {
          SurfacePoint.fromEdgeMidpoint(otherEdge!, face);
        }).toThrow('Edge is not part of the specified face');
      }
    });
  });

  describe('fromFaceCenter', () => {
    it('should create surface point at face center', () => {
      const point = SurfacePoint.fromFaceCenter(face);

      expect(point.face).toBe(face);
      expect(point.barycentricCoords[0]).toBeCloseTo(1 / 3, 10);
      expect(point.barycentricCoords[1]).toBeCloseTo(1 / 3, 10);
      expect(point.barycentricCoords[2]).toBeCloseTo(1 / 3, 10);
    });

    it('should not be on edge or vertex', () => {
      const center = SurfacePoint.fromFaceCenter(face);

      expect(center.isOnEdge()).toBe(false);
      expect(center.isOnVertex()).toBe(false);
    });
  });

  describe('coordinate interpolation', () => {
    it('should interpolate correctly between vertices', () => {
      const v0 = vertices[0]!;
      const v1 = vertices[1]!;

      // Point 25% along edge from v0 to v1
      const point = new SurfacePoint(face, [0.75, 0.25, 0]);
      const pos = point.toVector3();

      const expectedX = v0.position.x * 0.75 + v1.position.x * 0.25;
      const expectedY = v0.position.y * 0.75 + v1.position.y * 0.25;
      const expectedZ = v0.position.z * 0.75 + v1.position.z * 0.25;

      expect(pos.x).toBeCloseTo(expectedX, 5);
      expect(pos.y).toBeCloseTo(expectedY, 5);
      expect(pos.z).toBeCloseTo(expectedZ, 5);
    });
  });
});
