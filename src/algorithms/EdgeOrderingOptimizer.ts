import type { IntrinsicTriangulation } from '../core/IntrinsicTriangulation';
import type { Edge } from '../core/Edge';
import type { Vertex } from '../core/Vertex';
import type { VertexId } from '../types';
import { DijkstraShortestPath } from './DijkstraShortestPath';
import type { GeodesicPath } from './GeodesicPath';

/**
 * Options for edge ordering optimization.
 */
export interface OrderingOptions {
  /**
   * Whether to use greedy nearest-neighbor heuristic.
   * Default: true
   */
  useNearestNeighbor?: boolean;

  /**
   * Whether to apply 2-opt improvement after greedy ordering.
   * Default: true
   */
  use2Opt?: boolean;

  /**
   * Maximum iterations for 2-opt improvement.
   * Default: 100
   */
  max2OptIterations?: number;

  /**
   * Whether to skip edges that would cause self-crossing.
   * Default: true
   */
  skipCrossingEdges?: boolean;
}

/**
 * Result of edge ordering optimization.
 */
export interface OrderingResult {
  /**
   * Vertices in visiting order. First and last are the same (closed loop).
   */
  orderedWaypoints: Vertex[];

  /**
   * Edges that couldn't be incorporated without causing self-crossing.
   */
  skippedEdges: Edge[];

  /**
   * Estimated total loop length based on Dijkstra distances.
   */
  estimatedLength: number;
}

/**
 * Internal representation of an edge waypoint candidate.
 */
interface EdgeCandidate {
  edge: Edge;
  vertices: [Vertex, Vertex];
  visited: boolean;
}

/**
 * Optimizes the order of visiting input edges to minimize total loop length.
 * Uses a greedy nearest-neighbor heuristic followed by 2-opt improvement.
 *
 * This is essentially a traveling salesman problem (TSP) variant where we need
 * to visit edges (not just vertices) and return to the start.
 */
export class EdgeOrderingOptimizer {
  private readonly dijkstra: DijkstraShortestPath;

  /**
   * Default options for ordering.
   */
  private static readonly DEFAULT_OPTIONS: Required<OrderingOptions> = {
    useNearestNeighbor: true,
    use2Opt: true,
    max2OptIterations: 100,
    skipCrossingEdges: true,
  };

  constructor(triangulation: IntrinsicTriangulation) {
    this.dijkstra = new DijkstraShortestPath(triangulation);
  }

  /**
   * Optimizes the order of visiting input edges.
   *
   * @param inputEdges - The edges to visit (as waypoints)
   * @param options - Optimization options
   * @returns Optimized ordering result
   */
  optimizeOrder(inputEdges: Edge[], options: OrderingOptions = {}): OrderingResult {
    const opts = { ...EdgeOrderingOptimizer.DEFAULT_OPTIONS, ...options };

    if (inputEdges.length === 0) {
      return {
        orderedWaypoints: [],
        skippedEdges: [],
        estimatedLength: 0,
      };
    }

    if (inputEdges.length === 1) {
      // Single edge: just use one of its vertices as start and end
      const [v0, v1] = inputEdges[0]!.getVertices();
      if (!v0 || !v1) {
        return {
          orderedWaypoints: [],
          skippedEdges: inputEdges,
          estimatedLength: 0,
        };
      }
      return {
        orderedWaypoints: [v0, v1, v0],
        skippedEdges: [],
        estimatedLength: inputEdges[0]!.length * 2,
      };
    }

    // Convert edges to candidates
    const candidates: EdgeCandidate[] = inputEdges.map((edge) => {
      const [v0, v1] = edge.getVertices();
      return {
        edge,
        vertices: [v0!, v1!] as [Vertex, Vertex],
        visited: false,
      };
    });

    // Build distance matrix between all candidate vertices
    const distanceMatrix = this.buildDistanceMatrix(candidates);

    let ordering: Vertex[];
    let skippedEdges: Edge[] = [];

    if (opts.useNearestNeighbor) {
      // Greedy nearest-neighbor ordering
      const greedyResult = this.greedyOrdering(candidates, distanceMatrix, opts.skipCrossingEdges);
      ordering = greedyResult.ordering;
      skippedEdges = greedyResult.skippedEdges;
    } else {
      // Simple sequential ordering
      ordering = this.sequentialOrdering(candidates);
    }

    // Apply 2-opt improvement
    if (opts.use2Opt && ordering.length > 3) {
      ordering = this.twoOptImprove(ordering, distanceMatrix, opts.max2OptIterations);
    }

    // Close the loop
    if (ordering.length > 0 && ordering[ordering.length - 1]!.id !== ordering[0]!.id) {
      ordering.push(ordering[0]!);
    }

    // Calculate estimated length
    const estimatedLength = this.calculatePathLength(ordering, distanceMatrix);

    return {
      orderedWaypoints: ordering,
      skippedEdges,
      estimatedLength,
    };
  }

  /**
   * Builds a distance matrix between all candidate vertices using Dijkstra.
   */
  private buildDistanceMatrix(candidates: EdgeCandidate[]): Map<VertexId, Map<VertexId, number>> {
    const matrix = new Map<VertexId, Map<VertexId, number>>();

    // Collect all unique vertices
    const allVertices = new Set<Vertex>();
    for (const candidate of candidates) {
      allVertices.add(candidate.vertices[0]);
      allVertices.add(candidate.vertices[1]);
    }

    const vertexArray = Array.from(allVertices);

    // Compute distances from each vertex to all others
    for (const source of vertexArray) {
      const result = this.dijkstra.computeShortestPathTree([source.id]);
      const distances = new Map<VertexId, number>();

      for (const target of vertexArray) {
        const dist = result.distances.get(target.id);
        distances.set(target.id, dist ?? Infinity);
      }

      matrix.set(source.id, distances);
    }

    return matrix;
  }

  /**
   * Greedy nearest-neighbor ordering.
   * Starts from an arbitrary edge and repeatedly picks the closest unvisited edge.
   */
  private greedyOrdering(
    candidates: EdgeCandidate[],
    distanceMatrix: Map<VertexId, Map<VertexId, number>>,
    skipCrossing: boolean
  ): { ordering: Vertex[]; skippedEdges: Edge[] } {
    const ordering: Vertex[] = [];
    const skippedEdges: Edge[] = [];
    const usedEdges = new Set<Edge>();

    // Start with the first edge
    const firstCandidate = candidates[0]!;
    firstCandidate.visited = true;
    usedEdges.add(firstCandidate.edge);

    // Pick the vertex that will give the shortest total loop
    // For now, just start with the first vertex
    let currentVertex = firstCandidate.vertices[0];
    ordering.push(currentVertex);

    // Move to the other vertex of the first edge
    currentVertex = firstCandidate.vertices[1];
    ordering.push(currentVertex);

    // Process remaining edges
    const remaining = candidates.slice(1);

    while (remaining.some((c) => !c.visited)) {
      let bestDistance = Infinity;
      let bestCandidate: EdgeCandidate | null = null;
      let bestVertex: Vertex | null = null;

      for (const candidate of remaining) {
        if (candidate.visited) continue;

        // Check both vertices of this edge
        for (const targetVertex of candidate.vertices) {
          const dist = this.getDistance(distanceMatrix, currentVertex.id, targetVertex.id);

          if (dist < bestDistance) {
            // Check for self-crossing if enabled
            if (skipCrossing && this.wouldCauseCrossing(ordering, targetVertex, usedEdges)) {
              continue;
            }

            bestDistance = dist;
            bestCandidate = candidate;
            bestVertex = targetVertex;
          }
        }
      }

      if (bestCandidate && bestVertex) {
        bestCandidate.visited = true;
        usedEdges.add(bestCandidate.edge);

        // Add the chosen vertex
        ordering.push(bestVertex);

        // Move to the other vertex of this edge
        const otherVertex =
          bestVertex.id === bestCandidate.vertices[0].id
            ? bestCandidate.vertices[1]
            : bestCandidate.vertices[0];
        ordering.push(otherVertex);
        currentVertex = otherVertex;
      } else {
        // No reachable edge found - collect skipped edges
        for (const candidate of remaining) {
          if (!candidate.visited) {
            skippedEdges.push(candidate.edge);
            candidate.visited = true;
          }
        }
        break;
      }
    }

    return { ordering, skippedEdges };
  }

  /**
   * Simple sequential ordering (visits edges in input order).
   */
  private sequentialOrdering(candidates: EdgeCandidate[]): Vertex[] {
    const ordering: Vertex[] = [];

    if (candidates.length === 0) return ordering;

    let currentVertex = candidates[0]!.vertices[0];
    ordering.push(currentVertex);

    for (const candidate of candidates) {
      // Find which vertex of this edge is closer to current
      const dist0 = this.getEuclideanDistance(currentVertex, candidate.vertices[0]);
      const dist1 = this.getEuclideanDistance(currentVertex, candidate.vertices[1]);

      if (dist0 <= dist1) {
        ordering.push(candidate.vertices[0]);
        ordering.push(candidate.vertices[1]);
        currentVertex = candidate.vertices[1];
      } else {
        ordering.push(candidate.vertices[1]);
        ordering.push(candidate.vertices[0]);
        currentVertex = candidate.vertices[0];
      }
    }

    return ordering;
  }

  /**
   * 2-opt improvement: repeatedly reverses segments to reduce total length.
   */
  private twoOptImprove(
    ordering: Vertex[],
    distanceMatrix: Map<VertexId, Map<VertexId, number>>,
    maxIterations: number
  ): Vertex[] {
    let improved = true;
    let iterations = 0;
    let current = [...ordering];

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      for (let i = 0; i < current.length - 2; i++) {
        for (let j = i + 2; j < current.length - 1; j++) {
          // Calculate current distance
          const d1 = this.getDistance(distanceMatrix, current[i]!.id, current[i + 1]!.id);
          const d2 = this.getDistance(distanceMatrix, current[j]!.id, current[j + 1]!.id);

          // Calculate new distance if we reverse the segment [i+1, j]
          const d3 = this.getDistance(distanceMatrix, current[i]!.id, current[j]!.id);
          const d4 = this.getDistance(distanceMatrix, current[i + 1]!.id, current[j + 1]!.id);

          if (d3 + d4 < d1 + d2) {
            // Reverse the segment
            const reversed = current.slice(i + 1, j + 1).reverse();
            current = [...current.slice(0, i + 1), ...reversed, ...current.slice(j + 1)];
            improved = true;
          }
        }
      }
    }

    return current;
  }

  /**
   * Checks if adding a path to a new vertex would cause self-crossing.
   * This is a simplified heuristic that checks if the new vertex is already in the path.
   */
  private wouldCauseCrossing(
    currentPath: Vertex[],
    nextVertex: Vertex,
    _usedEdges: Set<Edge>
  ): boolean {
    // Simple check: if the vertex is already in the path, it might cause crossing
    // This is a conservative heuristic
    for (const v of currentPath) {
      if (v.id === nextVertex.id) {
        return true;
      }
    }

    // More sophisticated crossing detection would require computing the actual
    // Dijkstra path and checking for edge intersections, which is expensive.
    // For now, we rely on the conservative vertex check.

    return false;
  }

  /**
   * Gets distance between two vertices from the distance matrix.
   */
  private getDistance(
    matrix: Map<VertexId, Map<VertexId, number>>,
    from: VertexId,
    to: VertexId
  ): number {
    return matrix.get(from)?.get(to) ?? Infinity;
  }

  /**
   * Gets Euclidean distance between two vertices (fallback).
   */
  private getEuclideanDistance(v1: Vertex, v2: Vertex): number {
    const dx = v1.position.x - v2.position.x;
    const dy = v1.position.y - v2.position.y;
    const dz = v1.position.z - v2.position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculates total path length from ordering using distance matrix.
   */
  private calculatePathLength(
    ordering: Vertex[],
    distanceMatrix: Map<VertexId, Map<VertexId, number>>
  ): number {
    let total = 0;

    for (let i = 0; i < ordering.length - 1; i++) {
      total += this.getDistance(distanceMatrix, ordering[i]!.id, ordering[i + 1]!.id);
    }

    return total;
  }

  /**
   * Computes the shortest path between two vertices.
   * Useful for external callers who need path information.
   *
   * @param sourceId - Source vertex ID
   * @param targetId - Target vertex ID
   * @returns The geodesic path, or null if unreachable
   */
  computePath(sourceId: VertexId, targetId: VertexId): GeodesicPath | null {
    return this.dijkstra.computePath(sourceId, targetId);
  }
}
