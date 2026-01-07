import { Vector3, type BufferGeometry } from 'three';
import { Vertex } from './Vertex';
import { Edge, Halfedge } from './Edge';
import { Face } from './Face';
import {
  createVertexId,
  createEdgeId,
  createHalfedgeId,
  createFaceId,
  type VertexId,
  type EdgeId,
  type HalfedgeId,
  type FaceId,
} from '../types/MeshData';

/**
 * Represents an intrinsic triangulation of a mesh.
 * The intrinsic triangulation is defined by edge lengths rather than 3D positions,
 * allowing edges to be flipped without changing the surface geometry.
 */
export class IntrinsicTriangulation {
  public vertices: Map<VertexId, Vertex> = new Map();
  public edges: Map<EdgeId, Edge> = new Map();
  public halfedges: Map<HalfedgeId, Halfedge> = new Map();
  public faces: Map<FaceId, Face> = new Map();

  private nextVertexId = 0;
  private nextEdgeId = 0;
  private nextHalfedgeId = 0;
  private nextFaceId = 0;

  /**
   * Creates an intrinsic triangulation from a Three.js BufferGeometry.
   * The geometry must be triangulated (all faces must be triangles).
   */
  static fromBufferGeometry(geometry: BufferGeometry): IntrinsicTriangulation {
    const triangulation = new IntrinsicTriangulation();

    // Get position attribute
    const positions = geometry.attributes['position'];
    if (!positions) {
      throw new Error('Geometry must have a position attribute');
    }

    // Get index attribute (if not indexed, create sequential indices)
    const indices = geometry.index;
    if (!indices) {
      throw new Error('Geometry must be indexed');
    }

    const numVertices = positions.count;
    const numFaces = indices.count / 3;

    if (indices.count % 3 !== 0) {
      throw new Error('Geometry must be triangulated (indices count must be divisible by 3)');
    }

    // Create vertices
    for (let i = 0; i < numVertices; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const vertex = new Vertex(createVertexId(triangulation.nextVertexId++), new Vector3(x, y, z));
      triangulation.vertices.set(vertex.id, vertex);
    }

    // Track edges by vertex pair to avoid duplicates
    const edgeMap = new Map<string, Edge>();

    // Helper to get or create edge between two vertices
    const getOrCreateEdge = (v0Id: number, v1Id: number): Edge => {
      const key = v0Id < v1Id ? `${v0Id},${v1Id}` : `${v1Id},${v0Id}`;
      let edge = edgeMap.get(key);

      if (!edge) {
        const v0 = triangulation.vertices.get(createVertexId(v0Id));
        const v1 = triangulation.vertices.get(createVertexId(v1Id));
        if (!v0 || !v1) {
          throw new Error(`Vertex not found: ${v0Id} or ${v1Id}`);
        }

        // Calculate edge length from 3D positions
        const dx = v1.position.x - v0.position.x;
        const dy = v1.position.y - v0.position.y;
        const dz = v1.position.z - v0.position.z;
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Create edge with null halfedge placeholder (will be set later)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        edge = new Edge(createEdgeId(triangulation.nextEdgeId++), null as any, length);
        edgeMap.set(key, edge);
        triangulation.edges.set(edge.id, edge);
      }

      return edge;
    };

    // Create faces and halfedges
    for (let i = 0; i < numFaces; i++) {
      const i0 = indices.getX(i * 3 + 0);
      const i1 = indices.getX(i * 3 + 1);
      const i2 = indices.getX(i * 3 + 2);

      const v0 = triangulation.vertices.get(createVertexId(i0));
      const v1 = triangulation.vertices.get(createVertexId(i1));
      const v2 = triangulation.vertices.get(createVertexId(i2));

      if (!v0 || !v1 || !v2) {
        throw new Error(`Vertex not found in face ${i}: ${i0}, ${i1}, ${i2}`);
      }

      // Get or create edges
      const edge01 = getOrCreateEdge(i0, i1);
      const edge12 = getOrCreateEdge(i1, i2);
      const edge20 = getOrCreateEdge(i2, i0);

      // Create face
      const face = new Face(createFaceId(triangulation.nextFaceId++));
      triangulation.faces.set(face.id, face);

      // Create halfedges
      const he01 = new Halfedge(createHalfedgeId(triangulation.nextHalfedgeId++), v1, edge01);
      const he12 = new Halfedge(createHalfedgeId(triangulation.nextHalfedgeId++), v2, edge12);
      const he20 = new Halfedge(createHalfedgeId(triangulation.nextHalfedgeId++), v0, edge20);

      triangulation.halfedges.set(he01.id, he01);
      triangulation.halfedges.set(he12.id, he12);
      triangulation.halfedges.set(he20.id, he20);

      // Set up halfedge connectivity for this face
      he01.next = he12;
      he12.next = he20;
      he20.next = he01;

      he01.prev = he20;
      he12.prev = he01;
      he20.prev = he12;

      he01.face = face;
      he12.face = face;
      he20.face = face;

      // Set face's halfedge
      face.halfedge = he01;

      // Set vertex outgoing halfedge (if not already set)
      if (!v0.halfedge) v0.halfedge = he01;
      if (!v1.halfedge) v1.halfedge = he12;
      if (!v2.halfedge) v2.halfedge = he20;

      // Set edge's halfedge
      // For shared edges, we always use the most recently created halfedge
      // The other one will be found via the twin relationship
      edge01.halfedge = he01;
      edge12.halfedge = he12;
      edge20.halfedge = he20;
    }

    // Second pass: set up twin halfedges
    triangulation.setupTwinHalfedges();

    return triangulation;
  }

  /**
   * Sets up twin halfedge relationships.
   * For each edge, finds the two halfedges that share it and sets them as twins.
   */
  private setupTwinHalfedges(): void {
    // Group halfedges by edge
    const halfedgesByEdge = new Map<EdgeId, Halfedge[]>();

    for (const he of this.halfedges.values()) {
      const edgeId = he.edge.id;
      if (!halfedgesByEdge.has(edgeId)) {
        halfedgesByEdge.set(edgeId, []);
      }
      halfedgesByEdge.get(edgeId)!.push(he);
    }

    // Set up twins
    for (const [edgeId, halfedges] of halfedgesByEdge) {
      if (halfedges.length === 2) {
        // Interior edge
        halfedges[0]!.twin = halfedges[1]!;
        halfedges[1]!.twin = halfedges[0]!;
      } else if (halfedges.length === 1) {
        // Boundary edge - no twin
        halfedges[0]!.twin = null;
      } else {
        throw new Error(`Edge ${edgeId} has ${halfedges.length} halfedges (expected 1 or 2)`);
      }
    }

    // Update vertex halfedges to prefer interior edges
    // This ensures degree() calculations work correctly
    for (const he of this.halfedges.values()) {
      if (he.twin !== null) {
        // This is an interior halfedge
        const vertex = he.prev?.vertex;
        if (vertex) {
          // Update the source vertex to use this interior halfedge
          vertex.halfedge = he;
        }
      }
    }
  }

  /**
   * Flips an edge in the intrinsic triangulation.
   * The edge must be flippable (interior edge in a convex quad).
   * Returns true if the flip was successful, false otherwise.
   *
   * Based on standard halfedge edge flip algorithm.
   *
   * Before flip (edge connects vA to vB):
   *
   *         vC
   *        /|\
   *       / | \
   *      /  h  \
   *     / f0|   \
   *   vA----|----vB
   *     \ f1|   /
   *      \hTwin/
   *       \ | /
   *        \|/
   *        vD
   *
   * After flip (edge connects vC to vD):
   *
   *         vC
   *        / \
   *       / f0\
   *      /  h  \
   *     /   |   \
   *   vA    |    vB
   *     \   |   /
   *      \hTwin/
   *       \ f1/
   *        \ /
   *        vD
   */
  flipEdge(edge: Edge): boolean {
    if (!edge.canFlip()) {
      return false;
    }

    const h = edge.halfedge;
    const hTwin = h.twin;

    if (!hTwin) {
      return false; // Boundary edge
    }

    // Get the 4 surrounding halfedges (before any changes)
    // Face f0: h -> hNext -> hPrev -> h
    // Face f1: hTwin -> hTwinNext -> hTwinPrev -> hTwin
    const hNext = h.next!; // vB -> vC
    const hPrev = h.prev!; // vC -> vA
    const hTwinNext = hTwin.next!; // vA -> vD
    const hTwinPrev = hTwin.prev!; // vD -> vB

    // Get the 4 vertices of the quad
    const vA = hTwin.vertex; // h's source (hTwin's target)
    const vB = h.vertex; // h's target
    const vC = hNext.vertex; // Third vertex in h's triangle
    const vD = hTwinNext.vertex; // Third vertex in hTwin's triangle

    // Get faces
    const f0 = h.face;
    const f1 = hTwin.face;

    if (!f0 || !f1) {
      return false;
    }

    // Update edge length (new edge connects vC to vD)
    const dx = vD.position.x - vC.position.x;
    const dy = vD.position.y - vC.position.y;
    const dz = vD.position.z - vC.position.z;
    edge.length = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // After flip:
    // h: vC -> vD
    // hTwin: vD -> vC
    //
    // New face f0: h -> hTwinPrev -> hNext -> h
    //   h: vC -> vD
    //   hTwinPrev: vD -> vB
    //   hNext: vB -> vC
    //   Cycle: vC -> vD -> vB -> vC ✓
    //
    // New face f1: hTwin -> hPrev -> hTwinNext -> hTwin
    //   hTwin: vD -> vC
    //   hPrev: vC -> vA
    //   hTwinNext: vA -> vD
    //   Cycle: vD -> vC -> vA -> vD ✓

    // Update halfedge targets
    h.vertex = vD;
    hTwin.vertex = vC;

    // Set up face f0 cycle: h -> hTwinPrev -> hNext -> h
    h.next = hTwinPrev;
    h.prev = hNext;
    hTwinPrev.next = hNext;
    hTwinPrev.prev = h;
    hNext.next = h;
    hNext.prev = hTwinPrev;

    // Set up face f1 cycle: hTwin -> hPrev -> hTwinNext -> hTwin
    hTwin.next = hPrev;
    hTwin.prev = hTwinNext;
    hPrev.next = hTwinNext;
    hPrev.prev = hTwin;
    hTwinNext.next = hTwin;
    hTwinNext.prev = hPrev;

    // Update face assignments
    h.face = f0;
    hTwinPrev.face = f0;
    hNext.face = f0;

    hTwin.face = f1;
    hPrev.face = f1;
    hTwinNext.face = f1;

    // Update face halfedges
    f0.halfedge = h;
    f1.halfedge = hTwin;

    // Update vertex halfedges if they pointed to the flipped edge
    // vA's outgoing halfedge might have been h (vA->vB). Now h goes vC->vD.
    // We need an outgoing halfedge from vA. hTwinNext goes vA->vD.
    if (vA.halfedge === h) {
      vA.halfedge = hTwinNext;
    }
    // vB's outgoing halfedge might have been hTwin (vB->vA). Now hTwin goes vD->vC.
    // We need an outgoing halfedge from vB. hNext goes vB->vC.
    if (vB.halfedge === hTwin) {
      vB.halfedge = hNext;
    }

    return true;
  }

  /**
   * Checks if an edge satisfies the intrinsic Delaunay condition.
   * An edge is Delaunay if the sum of opposite angles is <= 180 degrees.
   */
  isDelaunay(edge: Edge): boolean {
    const he0 = edge.halfedge;
    const he1 = he0.twin;

    if (!he1 || !he0.face || !he1.face) {
      return true; // Boundary edges are always Delaunay
    }

    // Get the quadrilateral formed by the two triangles
    const f0 = he0.face;
    const f1 = he1.face;

    // Get the edge vertex (v1 is shared by both triangles)
    const v1 = he0.vertex;

    // Get opposite angles (angles at vertices not on the edge)
    const angle0 = f0.getOppositeAngle(v1);
    const angle2 = f1.getOppositeAngle(v1);

    if (angle0 === null || angle2 === null) {
      return true;
    }

    // Delaunay condition: sum of opposite angles <= π
    return angle0 + angle2 <= Math.PI + 1e-10; // Small epsilon for numerical tolerance
  }

  /**
   * Performs Delaunay flips on the mesh until it satisfies the Delaunay condition.
   * Returns the number of flips performed.
   */
  makeDelaunay(): number {
    let flipCount = 0;
    const maxIterations = this.edges.size * 10; // Safety limit
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      let flippedAny = false;

      for (const edge of this.edges.values()) {
        if (!this.isDelaunay(edge) && edge.canFlip()) {
          if (this.flipEdge(edge)) {
            flipCount++;
            flippedAny = true;
          }
        }
      }

      if (!flippedAny) {
        break; // Converged
      }
    }

    return flipCount;
  }

  /**
   * Gets all vertices in the mesh.
   */
  getVertices(): Vertex[] {
    return Array.from(this.vertices.values());
  }

  /**
   * Gets all edges in the mesh.
   */
  getEdges(): Edge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Gets all faces in the mesh.
   */
  getFaces(): Face[] {
    return Array.from(this.faces.values());
  }

  /**
   * Gets all halfedges in the mesh.
   */
  getHalfedges(): Halfedge[] {
    return Array.from(this.halfedges.values());
  }
}
