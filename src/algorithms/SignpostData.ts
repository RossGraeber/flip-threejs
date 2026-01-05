import type { IntrinsicTriangulation } from '../core/IntrinsicTriangulation';
import type { Vertex } from '../core/Vertex';
import type { Edge } from '../core/Edge';
import type { Halfedge } from '../core/Edge';
import type { HalfedgeId, VertexId } from '../types';

/**
 * Signpost data encodes intrinsic geometry by storing angular relationships
 * around vertices. This allows us to trace geodesic paths and compute angles
 * without relying on 3D embedding.
 *
 * For each vertex, we choose an arbitrary reference direction (the first outgoing
 * halfedge) and store the angle to reach each other outgoing halfedge by rotating
 * counter-clockwise around the vertex.
 */
export class SignpostData {
  /**
   * The intrinsic triangulation this signpost data is associated with.
   */
  private readonly triangulation: IntrinsicTriangulation;

  /**
   * For each halfedge, stores the angle from the reference direction at its vertex.
   * Angles are in radians, measured counter-clockwise.
   */
  private signposts: Map<HalfedgeId, number>;

  /**
   * For each vertex, stores the ID of the reference halfedge (angle = 0).
   * This is typically the first outgoing halfedge.
   */
  private referenceHalfedges: Map<VertexId, HalfedgeId>;

  /**
   * Creates signpost data for a triangulation.
   * Automatically initializes signposts for all vertices.
   *
   * @param triangulation - The intrinsic triangulation
   */
  constructor(triangulation: IntrinsicTriangulation) {
    this.triangulation = triangulation;
    this.signposts = new Map();
    this.referenceHalfedges = new Map();

    this.initialize();
  }

  /**
   * Initializes signpost data for all vertices in the triangulation.
   */
  private initialize(): void {
    for (const vertex of this.triangulation.getVertices()) {
      this.computeSignpostsAtVertex(vertex);
    }
  }

  /**
   * Computes signpost angles for all outgoing halfedges at a vertex.
   * Walks around the vertex counter-clockwise, accumulating face angles.
   *
   * @param vertex - The vertex to compute signposts for
   */
  computeSignpostsAtVertex(vertex: Vertex): void {
    const startHalfedge = vertex.halfedge;
    if (!startHalfedge) {
      return; // Isolated vertex
    }

    // Set the first halfedge as reference (angle 0)
    this.referenceHalfedges.set(vertex.id, startHalfedge.id);
    this.signposts.set(startHalfedge.id, 0);

    let currentAngle = 0;
    let currentHalfedge = startHalfedge;

    // Walk around vertex counter-clockwise
    do {
      // Move to next outgoing halfedge (twin->next)
      const twin = currentHalfedge.twin;
      if (!twin) {
        // Boundary halfedge - can't continue around
        break;
      }

      const next = twin.next;
      if (!next) {
        break;
      }

      // Add the angle at this vertex in the face we're leaving
      const face = twin.face;
      if (face) {
        const angleAtVertex = face.getAngleAtVertex(vertex);
        if (angleAtVertex !== null) {
          currentAngle += angleAtVertex;
        }
      }

      // Record angle for the next halfedge
      this.signposts.set(next.id, currentAngle);

      currentHalfedge = next;
    } while (currentHalfedge.id !== startHalfedge.id);
  }

  /**
   * Gets the signpost angle for a halfedge.
   * This is the angle from the reference direction at the halfedge's source vertex.
   *
   * @param halfedge - The halfedge
   * @returns Angle in radians
   */
  getAngle(halfedge: Halfedge): number {
    const angle = this.signposts.get(halfedge.id);
    if (angle === undefined) {
      throw new Error(`No signpost data for halfedge ${halfedge.id}`);
    }
    return angle;
  }

  /**
   * Gets the angle between two halfedges that share a vertex.
   * The angle is measured counter-clockwise from 'from' to 'to'.
   *
   * @param from - Starting halfedge
   * @param to - Ending halfedge
   * @returns Angle in radians
   */
  getAngleBetween(from: Halfedge, to: Halfedge): number {
    if (from.vertex.id !== to.vertex.id) {
      throw new Error('Halfedges must share a vertex');
    }

    const angleFrom = this.getAngle(from);
    const angleTo = this.getAngle(to);

    let diff = angleTo - angleFrom;

    // Normalize to [0, 2π)
    while (diff < 0) {
      diff += 2 * Math.PI;
    }
    while (diff >= 2 * Math.PI) {
      diff -= 2 * Math.PI;
    }

    return diff;
  }

  /**
   * Updates signpost data after an edge flip.
   * When an edge is flipped, the angles around all four vertices of the quad change.
   *
   * @param edge - The edge that was flipped
   */
  updateAfterFlip(edge: Edge): void {
    // Get the four vertices of the quad
    const he = edge.halfedge;
    const heTwin = he.twin;

    if (!heTwin) {
      return; // Boundary edge, shouldn't happen
    }

    // The four vertices are:
    // v0: vertex of he (the new edge after flip)
    // v1: vertex of he.twin (other endpoint of new edge)
    // v2: vertex of he.next (one of the old edge endpoints)
    // v3: vertex of he.twin.next (other old edge endpoint)

    const v0 = he.vertex;
    const v1 = heTwin.vertex;

    if (!he.next || !heTwin.next) {
      return;
    }

    const v2 = he.next.vertex;
    const v3 = heTwin.next.vertex;

    // Recompute signposts at all four vertices
    this.computeSignpostsAtVertex(v0);
    this.computeSignpostsAtVertex(v1);
    this.computeSignpostsAtVertex(v2);
    this.computeSignpostsAtVertex(v3);
  }

  /**
   * Gets all outgoing halfedges at a vertex, sorted by their signpost angles.
   *
   * @param vertex - The vertex
   * @returns Array of halfedges sorted counter-clockwise
   */
  getOutgoingHalfedgesSorted(vertex: Vertex): Halfedge[] {
    const halfedges: Halfedge[] = [];
    const startHe = vertex.halfedge;

    if (!startHe) {
      return halfedges;
    }

    let currentHe = startHe;
    do {
      halfedges.push(currentHe);

      const twin = currentHe.twin;
      if (!twin || !twin.next) {
        break;
      }

      currentHe = twin.next;
    } while (currentHe.id !== startHe.id);

    // Sort by signpost angle
    halfedges.sort((a, b) => this.getAngle(a) - this.getAngle(b));

    return halfedges;
  }

  /**
   * Checks if a turning angle is between two other angles (counter-clockwise).
   *
   * @param angle - The angle to check
   * @param start - Starting angle
   * @param end - Ending angle
   * @returns True if angle is in the range [start, end) counter-clockwise
   */
  isAngleBetween(angle: number, start: number, end: number): boolean {
    // Normalize all angles to [0, 2π)
    const normalizeAngle = (a: number): number => {
      let normalized = a % (2 * Math.PI);
      while (normalized < 0) normalized += 2 * Math.PI;
      return normalized;
    };

    const normAngle = normalizeAngle(angle);
    const normStart = normalizeAngle(start);
    const normEnd = normalizeAngle(end);

    if (normStart <= normEnd) {
      // No wraparound
      return normAngle >= normStart && normAngle < normEnd;
    } else {
      // Wraparound at 2π
      return normAngle >= normStart || normAngle < normEnd;
    }
  }

  /**
   * Gets the reference halfedge for a vertex (the one with angle = 0).
   *
   * @param vertex - The vertex
   * @returns The reference halfedge ID
   */
  getReferenceHalfedge(vertex: Vertex): HalfedgeId | undefined {
    return this.referenceHalfedges.get(vertex.id);
  }

  /**
   * Computes the total angle around a vertex.
   * For interior vertices, this should be ≤ 2π.
   * For boundary vertices, this will be less than 2π.
   *
   * @param vertex - The vertex
   * @returns Total angle in radians
   */
  getTotalAngleAtVertex(vertex: Vertex): number {
    const startHe = vertex.halfedge;
    if (!startHe) {
      return 0;
    }

    let totalAngle = 0;
    let currentHe = startHe;

    do {
      const twin = currentHe.twin;
      if (!twin) {
        // Boundary - add the angle in the current face
        const face = currentHe.face;
        if (face) {
          const angle = face.getAngleAtVertex(vertex);
          if (angle !== null) {
            totalAngle += angle;
          }
        }
        break;
      }

      const face = twin.face;
      if (face) {
        const angle = face.getAngleAtVertex(vertex);
        if (angle !== null) {
          totalAngle += angle;
        }
      }

      const next = twin.next;
      if (!next) {
        break;
      }

      currentHe = next;
    } while (currentHe.id !== startHe.id);

    return totalAngle;
  }
}
