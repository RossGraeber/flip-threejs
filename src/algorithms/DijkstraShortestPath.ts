import type { IntrinsicTriangulation } from '../core/IntrinsicTriangulation';
import type { Vertex } from '../core/Vertex';
import type { Edge } from '../core/Edge';
import type { VertexId } from '../types';
import type { DijkstraResult } from '../types/PathData';
import { GeodesicPath } from './GeodesicPath';

/**
 * Priority queue entry for Dijkstra's algorithm.
 */
interface PriorityQueueEntry {
  vertexId: VertexId;
  distance: number;
}

/**
 * Simple binary min-heap for priority queue.
 */
class MinHeap {
  private heap: PriorityQueueEntry[] = [];

  push(entry: PriorityQueueEntry): void {
    this.heap.push(entry);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): PriorityQueueEntry | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }

    const min = this.heap[0];
    const last = this.heap.pop();

    if (this.heap.length > 0 && last) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }

    return min;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);

      if (this.heap[index]!.distance >= this.heap[parentIndex]!.distance) {
        break;
      }

      // Swap
      const temp = this.heap[index]!;
      this.heap[index] = this.heap[parentIndex]!;
      this.heap[parentIndex] = temp;
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (
        leftChild < this.heap.length &&
        this.heap[leftChild]!.distance < this.heap[smallest]!.distance
      ) {
        smallest = leftChild;
      }

      if (
        rightChild < this.heap.length &&
        this.heap[rightChild]!.distance < this.heap[smallest]!.distance
      ) {
        smallest = rightChild;
      }

      if (smallest === index) {
        break;
      }

      // Swap
      const temp = this.heap[index]!;
      this.heap[index] = this.heap[smallest]!;
      this.heap[smallest] = temp;
      index = smallest;
    }
  }
}

/**
 * Implements Dijkstra's shortest path algorithm on the intrinsic triangulation.
 * Uses edge lengths as distances.
 */
export class DijkstraShortestPath {
  /**
   * The intrinsic triangulation to compute paths on.
   */
  private readonly triangulation: IntrinsicTriangulation;

  constructor(triangulation: IntrinsicTriangulation) {
    this.triangulation = triangulation;
  }

  /**
   * Computes the shortest path from source to target vertex.
   *
   * @param sourceId - Source vertex ID
   * @param targetId - Target vertex ID
   * @returns GeodesicPath from source to target, or null if no path exists
   */
  computePath(sourceId: VertexId, targetId: VertexId): GeodesicPath | null {
    const result = this.runDijkstra([sourceId], targetId);

    if (!result.targetReached) {
      return null;
    }

    return this.reconstructPath(sourceId, targetId, result);
  }

  /**
   * Computes a piecewise path through multiple waypoints.
   * Each segment is a shortest path between consecutive waypoints.
   *
   * @param waypoints - Array of vertex IDs to visit in order
   * @returns Array of GeodesicPath segments, or null if any segment is unreachable
   */
  computePiecewisePath(waypoints: VertexId[]): GeodesicPath[] | null {
    if (waypoints.length < 2) {
      throw new Error('Must provide at least 2 waypoints');
    }

    const paths: GeodesicPath[] = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const path = this.computePath(waypoints[i]!, waypoints[i + 1]!);

      if (!path) {
        return null; // Path segment not reachable
      }

      paths.push(path);
    }

    return paths;
  }

  /**
   * Computes shortest path tree from multiple source vertices.
   * Useful for computing distance fields.
   *
   * @param sourceIds - Array of source vertex IDs
   * @param targetId - Optional target to stop early
   * @returns Dijkstra result with distances and parents
   */
  computeShortestPathTree(sourceIds: VertexId[], targetId?: VertexId): DijkstraResult {
    return this.runDijkstra(sourceIds, targetId);
  }

  /**
   * Core Dijkstra implementation.
   *
   * @param sourceIds - Source vertices (distance 0)
   * @param targetId - Optional target to stop early
   * @returns Dijkstra result
   */
  private runDijkstra(sourceIds: VertexId[], targetId?: VertexId): DijkstraResult {
    const distances = new Map<VertexId, number>();
    const parents = new Map<VertexId, VertexId | null>();
    const visited = new Set<VertexId>();
    const queue = new MinHeap();

    // Initialize sources
    for (const sourceId of sourceIds) {
      distances.set(sourceId, 0);
      parents.set(sourceId, null);
      queue.push({ vertexId: sourceId, distance: 0 });
    }

    let targetReached = false;

    while (!queue.isEmpty()) {
      const current = queue.pop();
      if (!current) break;

      const { vertexId: currentId, distance: currentDist } = current;

      // Skip if already visited
      if (visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      // Check if we reached the target
      if (targetId !== undefined && currentId === targetId) {
        targetReached = true;
        break;
      }

      // Get current vertex
      const currentVertex = this.triangulation.vertices.get(currentId);
      if (!currentVertex) {
        continue;
      }

      // Explore neighbors
      const neighbors = this.getNeighbors(currentVertex);

      for (const { vertex: neighbor, edge } of neighbors) {
        if (visited.has(neighbor.id)) {
          continue;
        }

        const newDist = currentDist + edge.length;
        const oldDist = distances.get(neighbor.id);

        if (oldDist === undefined || newDist < oldDist) {
          distances.set(neighbor.id, newDist);
          parents.set(neighbor.id, currentId);
          queue.push({ vertexId: neighbor.id, distance: newDist });
        }
      }
    }

    return {
      distances,
      parents,
      targetReached: targetId === undefined ? true : targetReached,
    };
  }

  /**
   * Gets all neighboring vertices and the edges connecting to them.
   *
   * @param vertex - The vertex
   * @returns Array of neighbor vertices and connecting edges
   */
  private getNeighbors(vertex: Vertex): Array<{ vertex: Vertex; edge: Edge }> {
    const neighbors: Array<{ vertex: Vertex; edge: Edge }> = [];
    const startHe = vertex.halfedge;

    if (!startHe) {
      return neighbors;
    }

    let currentHe = startHe;

    do {
      // currentHe is an outgoing halfedge from `vertex`
      // currentHe.vertex is the target (the neighbor)
      const edge = currentHe.edge;
      const neighborVertex = currentHe.vertex;

      neighbors.push({ vertex: neighborVertex, edge });

      // Move to next outgoing halfedge from `vertex`
      // Go to twin (points back to `vertex`), then to next (points to next neighbor)
      const twin = currentHe.twin;
      if (!twin || !twin.next) {
        break; // Boundary
      }

      currentHe = twin.next;
    } while (currentHe.id !== startHe.id);

    return neighbors;
  }

  /**
   * Reconstructs the path from source to target using parent pointers.
   *
   * @param sourceId - Source vertex ID
   * @param targetId - Target vertex ID
   * @param result - Dijkstra result with parent pointers
   * @returns GeodesicPath from source to target
   */
  private reconstructPath(
    sourceId: VertexId,
    targetId: VertexId,
    result: DijkstraResult
  ): GeodesicPath | null {
    // Backtrack from target to source
    const vertexPath: VertexId[] = [];
    let current: VertexId | null = targetId;

    while (current !== null) {
      vertexPath.unshift(current);

      if (current === sourceId) {
        break;
      }

      const parent = result.parents.get(current);
      if (parent === undefined) {
        return null; // Path broken
      }

      current = parent as VertexId | null;
    }

    if (vertexPath[0] !== sourceId) {
      return null; // Didn't reach source
    }

    if (vertexPath.length < 2) {
      return null; // Path too short
    }

    // Convert vertex path to edge path
    const edges: Edge[] = [];

    for (let i = 0; i < vertexPath.length - 1; i++) {
      const v1 = this.triangulation.vertices.get(vertexPath[i]!);
      const v2 = this.triangulation.vertices.get(vertexPath[i + 1]!);

      if (!v1 || !v2) {
        return null;
      }

      const edge = this.findEdgeBetween(v1, v2);
      if (!edge) {
        return null;
      }

      edges.push(edge);
    }

    const sourceVertex = this.triangulation.vertices.get(sourceId);
    const targetVertex = this.triangulation.vertices.get(targetId);

    if (!sourceVertex || !targetVertex) {
      return null;
    }

    return new GeodesicPath(edges, sourceVertex, targetVertex);
  }

  /**
   * Finds the edge connecting two adjacent vertices.
   *
   * @param v1 - First vertex
   * @param v2 - Second vertex
   * @returns The edge, or null if not adjacent
   */
  private findEdgeBetween(v1: Vertex, v2: Vertex): Edge | null {
    const startHe = v1.halfedge;
    if (!startHe) {
      return null;
    }

    let currentHe = startHe;

    do {
      // currentHe is an outgoing halfedge from v1
      // currentHe.vertex is the target - check if it's v2
      if (currentHe.vertex.id === v2.id) {
        return currentHe.edge;
      }

      // Move to next outgoing halfedge from v1
      const twin = currentHe.twin;
      if (!twin || !twin.next) {
        break;
      }

      currentHe = twin.next;
    } while (currentHe.id !== startHe.id);

    return null;
  }
}
