import { describe, it, expect, beforeEach } from 'vitest';
import { Vertex } from '../../../src/core/Vertex';
import { Edge, Halfedge } from '../../../src/core/Edge';
import { Face } from '../../../src/core/Face';
import { createVertexId, createEdgeId, createHalfedgeId, createFaceId } from '../../../src/types';

describe('Mesh Elements', () => {
  describe('Vertex', () => {
    it('should create vertex with id and position', () => {
      const id = createVertexId(0);
      const position = { x: 1, y: 2, z: 3 };
      const vertex = new Vertex(id, position);

      expect(vertex.id).toBe(id);
      expect(vertex.position).toEqual(position);
      expect(vertex.halfedge).toBeNull();
      expect(vertex.isMarked).toBe(false);
    });

    it('should mark vertex', () => {
      const vertex = new Vertex(createVertexId(0), { x: 0, y: 0, z: 0 });
      vertex.isMarked = true;
      expect(vertex.isMarked).toBe(true);
    });

    it('should return null degree for vertex with no halfedge', () => {
      const vertex = new Vertex(createVertexId(0), { x: 0, y: 0, z: 0 });
      expect(vertex.degree()).toBeNull();
    });

    it('should return true for boundary when no halfedge', () => {
      const vertex = new Vertex(createVertexId(0), { x: 0, y: 0, z: 0 });
      expect(vertex.isBoundary()).toBe(true);
    });
  });

  describe('Halfedge', () => {
    let vertex: Vertex;
    let edge: Edge;
    let halfedge: Halfedge;

    beforeEach(() => {
      vertex = new Vertex(createVertexId(0), { x: 0, y: 0, z: 0 });
      edge = new Edge(createEdgeId(0), null as any, 1.0);
      halfedge = new Halfedge(createHalfedgeId(0), vertex, edge);
      edge.halfedge = halfedge;
    });

    it('should create halfedge with vertex and edge', () => {
      expect(halfedge.vertex).toBe(vertex);
      expect(halfedge.edge).toBe(edge);
      expect(halfedge.twin).toBeNull();
      expect(halfedge.next).toBeNull();
      expect(halfedge.prev).toBeNull();
      expect(halfedge.face).toBeNull();
    });

    it('should get target vertex', () => {
      expect(halfedge.getTargetVertex()).toBe(vertex);
    });

    it('should return null for source vertex when no twin', () => {
      expect(halfedge.getSourceVertex()).toBeNull();
    });

    it('should get source vertex from twin', () => {
      const sourceVertex = new Vertex(createVertexId(1), { x: 1, y: 0, z: 0 });
      const twin = new Halfedge(createHalfedgeId(1), sourceVertex, edge);

      halfedge.twin = twin;
      twin.twin = halfedge;

      expect(halfedge.getSourceVertex()).toBe(sourceVertex);
    });

    it('should return true for isBoundary when no face', () => {
      expect(halfedge.isBoundary()).toBe(true);
    });

    it('should return false for isBoundary when has face', () => {
      const face = new Face(createFaceId(0), halfedge);
      halfedge.face = face;

      expect(halfedge.isBoundary()).toBe(false);
    });
  });

  describe('Edge', () => {
    let vertex0: Vertex;
    let vertex1: Vertex;
    let edge: Edge;
    let halfedge0: Halfedge;
    let halfedge1: Halfedge;

    beforeEach(() => {
      vertex0 = new Vertex(createVertexId(0), { x: 0, y: 0, z: 0 });
      vertex1 = new Vertex(createVertexId(1), { x: 1, y: 0, z: 0 });

      edge = new Edge(createEdgeId(0), null as any, 1.0);

      halfedge0 = new Halfedge(createHalfedgeId(0), vertex1, edge);
      halfedge1 = new Halfedge(createHalfedgeId(1), vertex0, edge);

      halfedge0.twin = halfedge1;
      halfedge1.twin = halfedge0;

      edge.halfedge = halfedge0;

      vertex0.halfedge = halfedge0;
      vertex1.halfedge = halfedge1;
    });

    it('should create edge with halfedge and length', () => {
      expect(edge.halfedge).toBe(halfedge0);
      expect(edge.length).toBe(1.0);
      expect(edge.isInPath).toBe(false);
    });

    it('should mark edge as in path', () => {
      edge.isInPath = true;
      expect(edge.isInPath).toBe(true);
    });

    it('should get both vertices', () => {
      const [v0, v1] = edge.getVertices();
      expect(v0).toBe(vertex0);
      expect(v1).toBe(vertex1);
    });

    it('should get both faces', () => {
      const face0 = new Face(createFaceId(0), halfedge0);
      const face1 = new Face(createFaceId(1), halfedge1);

      halfedge0.face = face0;
      halfedge1.face = face1;

      const [f0, f1] = edge.getFaces();
      expect(f0).toBe(face0);
      expect(f1).toBe(face1);
    });

    it('should return true for isBoundary when one face is null', () => {
      const face = new Face(createFaceId(0), halfedge0);
      halfedge0.face = face;

      expect(edge.isBoundary()).toBe(true);
    });

    it('should return false for isBoundary when both faces exist', () => {
      const face0 = new Face(createFaceId(0), halfedge0);
      const face1 = new Face(createFaceId(1), halfedge1);

      halfedge0.face = face0;
      halfedge1.face = face1;

      expect(edge.isBoundary()).toBe(false);
    });

    it('should get other vertex', () => {
      const other = edge.getOtherVertex(vertex0);
      expect(other).toBe(vertex1);

      const other2 = edge.getOtherVertex(vertex1);
      expect(other2).toBe(vertex0);
    });

    it('should return null for vertex not in edge', () => {
      const vertex2 = new Vertex(createVertexId(2), { x: 2, y: 0, z: 0 });
      const other = edge.getOtherVertex(vertex2);
      expect(other).toBeNull();
    });
  });

  describe('Face', () => {
    let v0: Vertex;
    let v1: Vertex;
    let v2: Vertex;
    let e01: Edge;
    let e12: Edge;
    let e20: Edge;
    let he01: Halfedge;
    let he12: Halfedge;
    let he20: Halfedge;
    let face: Face;

    beforeEach(() => {
      // Create vertices for an equilateral triangle
      v0 = new Vertex(createVertexId(0), { x: 0, y: 0, z: 0 });
      v1 = new Vertex(createVertexId(1), { x: 1, y: 0, z: 0 });
      v2 = new Vertex(createVertexId(2), { x: 0.5, y: Math.sqrt(3) / 2, z: 0 });

      // Create edges
      e01 = new Edge(createEdgeId(0), null as any, 1.0);
      e12 = new Edge(createEdgeId(1), null as any, 1.0);
      e20 = new Edge(createEdgeId(2), null as any, 1.0);

      // Create halfedges for the face (counter-clockwise)
      he01 = new Halfedge(createHalfedgeId(0), v1, e01);
      he12 = new Halfedge(createHalfedgeId(1), v2, e12);
      he20 = new Halfedge(createHalfedgeId(2), v0, e20);

      // Link next/prev
      he01.next = he12;
      he12.next = he20;
      he20.next = he01;

      he01.prev = he20;
      he12.prev = he01;
      he20.prev = he12;

      // Set edge halfedges
      e01.halfedge = he01;
      e12.halfedge = he12;
      e20.halfedge = he20;

      // Create face
      face = new Face(createFaceId(0), he01);

      // Link halfedges to face
      he01.face = face;
      he12.face = face;
      he20.face = face;
    });

    it('should create face with halfedge', () => {
      expect(face.halfedge).toBe(he01);
    });

    it('should get all three vertices', () => {
      const vertices = face.getVertices();
      expect(vertices).not.toBeNull();

      if (vertices) {
        const [va, vb, vc] = vertices;
        expect(va).toBe(v1);
        expect(vb).toBe(v2);
        expect(vc).toBe(v0);
      }
    });

    it('should get all three halfedges', () => {
      const halfedges = face.getHalfedges();
      expect(halfedges).not.toBeNull();

      if (halfedges) {
        const [h0, h1, h2] = halfedges;
        expect(h0).toBe(he01);
        expect(h1).toBe(he12);
        expect(h2).toBe(he20);
      }
    });

    it('should get edge lengths', () => {
      const lengths = face.getEdgeLengths();
      expect(lengths).not.toBeNull();

      if (lengths) {
        const [l0, l1, l2] = lengths;
        expect(l0).toBe(1.0);
        expect(l1).toBe(1.0);
        expect(l2).toBe(1.0);
      }
    });

    it('should compute angles for equilateral triangle', () => {
      const angles = face.getAngles();
      expect(angles).not.toBeNull();

      if (angles) {
        const [a0, a1, a2] = angles;
        const expectedAngle = Math.PI / 3;

        expect(a0).toBeCloseTo(expectedAngle, 5);
        expect(a1).toBeCloseTo(expectedAngle, 5);
        expect(a2).toBeCloseTo(expectedAngle, 5);
      }
    });

    it('should get angle at specific vertex', () => {
      const angle = face.getAngleAtVertex(v0);
      expect(angle).not.toBeNull();

      if (angle !== null) {
        expect(angle).toBeCloseTo(Math.PI / 3, 5);
      }
    });

    it('should return null for angle at vertex not in face', () => {
      const v3 = new Vertex(createVertexId(3), { x: 2, y: 0, z: 0 });
      const angle = face.getAngleAtVertex(v3);
      expect(angle).toBeNull();
    });

    it('should compute area of equilateral triangle', () => {
      const area = face.getArea();
      expect(area).not.toBeNull();

      if (area !== null) {
        const expectedArea = (Math.sqrt(3) / 4) * 1 * 1;
        expect(area).toBeCloseTo(expectedArea, 5);
      }
    });

    it('should check if face contains vertex', () => {
      expect(face.containsVertex(v0)).toBe(true);
      expect(face.containsVertex(v1)).toBe(true);
      expect(face.containsVertex(v2)).toBe(true);

      const v3 = new Vertex(createVertexId(3), { x: 2, y: 0, z: 0 });
      expect(face.containsVertex(v3)).toBe(false);
    });

    it('should get halfedge from vertex', () => {
      // Halfedge from v0 is he20 (v0 -> v1 in the face, but he20 points to v0, so actually we need he20.next which is he01)
      // Actually, getHalfedgeFromVertex looks for halfedge where source = given vertex
      // he01 source is v0 (he01.twin.vertex would be v0 if twin existed)

      // Let's think about this more carefully:
      // he01 points to v1, so its source is the vertex of its twin
      // For this test to work properly, we need to set up twins

      const he10 = new Halfedge(createHalfedgeId(3), v0, e01);
      const he21 = new Halfedge(createHalfedgeId(4), v1, e12);
      const he02 = new Halfedge(createHalfedgeId(5), v2, e20);

      he01.twin = he10;
      he10.twin = he01;
      he12.twin = he21;
      he21.twin = he12;
      he20.twin = he02;
      he02.twin = he20;

      // Now he20's source is v2, he01's source is v0, he12's source is v1
      const heFromV0 = face.getHalfedgeFromVertex(v0);
      expect(heFromV0).toBe(he01);
    });

    it('should get opposite halfedge to vertex', () => {
      // Opposite to v0 is the edge between v1 and v2, which is he12
      const opposite = face.getOppositeHalfedge(v0);
      expect(opposite).toBe(he12);
    });
  });
});
