import type { VertexId } from '../types';
import type { Halfedge } from './Edge';

/**
 * Represents a vertex in the mesh.
 * Stores position and a reference to one outgoing halfedge.
 */
export class Vertex {
  /**
   * One outgoing halfedge from this vertex.
   * All outgoing halfedges can be found by following next/twin pointers.
   */
  public halfedge: Halfedge | null = null;

  /**
   * Whether this vertex is marked (e.g., as a control point for Bezier curves).
   */
  public isMarked: boolean = false;

  constructor(
    /**
     * Unique identifier for this vertex.
     */
    public readonly id: VertexId,

    /**
     * 3D position of this vertex in the original mesh.
     */
    public readonly position: { x: number; y: number; z: number }
  ) {}

  /**
   * Gets the degree of this vertex (number of incident edges).
   * Returns null if the vertex has no incident halfedge.
   */
  degree(): number | null {
    if (!this.halfedge) {
      return null;
    }

    let count = 0;
    let current = this.halfedge;

    do {
      count++;
      // Move to next outgoing halfedge by going to twin's next
      if (!current.twin || !current.twin.next) {
        // Boundary vertex or invalid structure
        break;
      }
      current = current.twin.next;

      // Safety check to prevent infinite loops
      if (count > 1000) {
        throw new Error(`Vertex ${this.id}: degree calculation exceeded maximum iterations`);
      }
    } while (current !== this.halfedge);

    return count;
  }

  /**
   * Iterates over all outgoing halfedges from this vertex.
   *
   * @param callback - Function called for each outgoing halfedge
   */
  forEachOutgoingHalfedge(callback: (halfedge: Halfedge) => void): void {
    if (!this.halfedge) {
      return;
    }

    let current = this.halfedge;
    let iterationCount = 0;

    do {
      callback(current);

      // Move to next outgoing halfedge
      if (!current.twin || !current.twin.next) {
        break;
      }
      current = current.twin.next;

      // Safety check
      iterationCount++;
      if (iterationCount > 1000) {
        throw new Error(`Vertex ${this.id}: halfedge iteration exceeded maximum iterations`);
      }
    } while (current !== this.halfedge);
  }

  /**
   * Checks if this vertex is on the boundary of the mesh.
   * A vertex is on the boundary if any of its incident halfedges has no face.
   */
  isBoundary(): boolean {
    if (!this.halfedge) {
      return true;
    }

    let hasBoundaryHalfedge = false;
    this.forEachOutgoingHalfedge((he) => {
      if (!he.face) {
        hasBoundaryHalfedge = true;
      }
    });

    return hasBoundaryHalfedge;
  }
}
