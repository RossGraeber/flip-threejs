import { describe, it, expect } from 'vitest';
import { GeometricUtils } from '../../../src/geometry/GeometricUtils';

describe('GeometricUtils', () => {
  describe('angleFromSides', () => {
    it('should compute angle in an equilateral triangle', () => {
      const angle = GeometricUtils.angleFromSides(1, 1, 1);
      expect(angle).toBeCloseTo(Math.PI / 3, 10);
    });

    it('should compute angle in a right triangle', () => {
      // 3-4-5 right triangle
      const rightAngle = GeometricUtils.angleFromSides(5, 3, 4);
      expect(rightAngle).toBeCloseTo(Math.PI / 2, 10);

      const angle1 = GeometricUtils.angleFromSides(3, 4, 5);
      const angle2 = GeometricUtils.angleFromSides(4, 5, 3);

      // All angles should sum to π
      expect(rightAngle + angle1 + angle2).toBeCloseTo(Math.PI, 10);
    });

    it('should throw error for degenerate triangle', () => {
      expect(() => GeometricUtils.angleFromSides(1, 0, 1)).toThrow();
    });

    it('should handle obtuse angles', () => {
      // Triangle with sides 2, 2, 3 has one obtuse angle
      const angle = GeometricUtils.angleFromSides(3, 2, 2);
      expect(angle).toBeGreaterThan(Math.PI / 2);
      expect(angle).toBeLessThan(Math.PI);
    });
  });

  describe('triangleAngles', () => {
    it('should compute all angles of an equilateral triangle', () => {
      const [a, b, c] = GeometricUtils.triangleAngles(1, 1, 1);
      expect(a).toBeCloseTo(Math.PI / 3, 10);
      expect(b).toBeCloseTo(Math.PI / 3, 10);
      expect(c).toBeCloseTo(Math.PI / 3, 10);
    });

    it('should compute all angles sum to π', () => {
      const [a, b, c] = GeometricUtils.triangleAngles(3, 4, 5);
      expect(a + b + c).toBeCloseTo(Math.PI, 10);
    });

    it('should handle isosceles triangle', () => {
      const [a, b, c] = GeometricUtils.triangleAngles(2, 2, 3);
      expect(a).toBeCloseTo(b, 10); // Base angles equal
      expect(c).toBeGreaterThan(a); // Apex angle larger
    });
  });

  describe('triangleArea', () => {
    it('should compute area of a 3-4-5 right triangle', () => {
      const area = GeometricUtils.triangleArea(3, 4, 5);
      expect(area).toBeCloseTo(6, 10); // (1/2) * 3 * 4 = 6
    });

    it('should compute area of an equilateral triangle', () => {
      const side = 2;
      const area = GeometricUtils.triangleArea(side, side, side);
      const expectedArea = (Math.sqrt(3) / 4) * side * side;
      expect(area).toBeCloseTo(expectedArea, 10);
    });

    it('should throw error for invalid triangle', () => {
      expect(() => GeometricUtils.triangleArea(1, 2, 10)).toThrow();
    });

    it('should return zero for degenerate triangle', () => {
      const area = GeometricUtils.triangleArea(1, 2, 3);
      expect(area).toBeCloseTo(0, 10);
    });
  });

  describe('isValidTriangle', () => {
    it('should return true for valid triangles', () => {
      expect(GeometricUtils.isValidTriangle(3, 4, 5)).toBe(true);
      expect(GeometricUtils.isValidTriangle(1, 1, 1)).toBe(true);
      expect(GeometricUtils.isValidTriangle(2, 3, 4)).toBe(true);
    });

    it('should return false for invalid triangles', () => {
      expect(GeometricUtils.isValidTriangle(1, 2, 10)).toBe(false);
      expect(GeometricUtils.isValidTriangle(1, 1, 2)).toBe(false); // Degenerate
      expect(GeometricUtils.isValidTriangle(0, 1, 1)).toBe(false); // Zero length
      expect(GeometricUtils.isValidTriangle(-1, 2, 2)).toBe(false); // Negative length
    });
  });

  describe('layoutTriangle', () => {
    it('should layout equilateral triangle correctly', () => {
      const [A, B, C] = GeometricUtils.layoutTriangle(1, 1, 1);

      expect(A.x).toBeCloseTo(0, 10);
      expect(A.y).toBeCloseTo(0, 10);

      expect(B.x).toBeCloseTo(1, 10);
      expect(B.y).toBeCloseTo(0, 10);

      expect(C.x).toBeCloseTo(0.5, 10);
      expect(C.y).toBeCloseTo(Math.sqrt(3) / 2, 10);
    });

    it('should layout right triangle correctly', () => {
      const [A, B, C] = GeometricUtils.layoutTriangle(4, 5, 3);

      expect(A.x).toBeCloseTo(0, 10);
      expect(A.y).toBeCloseTo(0, 10);

      expect(B.x).toBeCloseTo(4, 10);
      expect(B.y).toBeCloseTo(0, 10);

      // C should be at distance 3 from A and 5 from B
      const distAC = Math.sqrt(C.x * C.x + C.y * C.y);
      const distBC = Math.sqrt((C.x - 4) ** 2 + C.y ** 2);

      expect(distAC).toBeCloseTo(3, 10);
      expect(distBC).toBeCloseTo(5, 10);
    });

    it('should throw error for invalid triangle', () => {
      expect(() => GeometricUtils.layoutTriangle(1, 2, 10)).toThrow();
    });
  });

  describe('barycentricToCartesian3D', () => {
    it('should convert barycentric coordinates correctly', () => {
      const p0 = { x: 0, y: 0, z: 0 };
      const p1 = { x: 1, y: 0, z: 0 };
      const p2 = { x: 0, y: 1, z: 0 };

      // Center of triangle
      const center = GeometricUtils.barycentricToCartesian3D(1 / 3, 1 / 3, 1 / 3, p0, p1, p2);
      expect(center.x).toBeCloseTo(1 / 3, 10);
      expect(center.y).toBeCloseTo(1 / 3, 10);
      expect(center.z).toBeCloseTo(0, 10);

      // Vertex p0
      const v0 = GeometricUtils.barycentricToCartesian3D(1, 0, 0, p0, p1, p2);
      expect(v0.x).toBeCloseTo(0, 10);
      expect(v0.y).toBeCloseTo(0, 10);

      // Midpoint of p0-p1
      const mid = GeometricUtils.barycentricToCartesian3D(0.5, 0.5, 0, p0, p1, p2);
      expect(mid.x).toBeCloseTo(0.5, 10);
      expect(mid.y).toBeCloseTo(0, 10);
    });
  });

  describe('cartesianToBarycentric3D', () => {
    it('should convert Cartesian to barycentric correctly', () => {
      const p0 = { x: 0, y: 0, z: 0 };
      const p1 = { x: 1, y: 0, z: 0 };
      const p2 = { x: 0, y: 1, z: 0 };

      // Center of triangle
      const center = { x: 1 / 3, y: 1 / 3, z: 0 };
      const [u, v, w] = GeometricUtils.cartesianToBarycentric3D(center, p0, p1, p2);

      expect(u).toBeCloseTo(1 / 3, 10);
      expect(v).toBeCloseTo(1 / 3, 10);
      expect(w).toBeCloseTo(1 / 3, 10);
      expect(u + v + w).toBeCloseTo(1, 10);
    });

    it('should handle vertices correctly', () => {
      const p0 = { x: 0, y: 0, z: 0 };
      const p1 = { x: 1, y: 0, z: 0 };
      const p2 = { x: 0, y: 1, z: 0 };

      const [u, v, w] = GeometricUtils.cartesianToBarycentric3D(p0, p0, p1, p2);
      expect(u).toBeCloseTo(1, 10);
      expect(v).toBeCloseTo(0, 10);
      expect(w).toBeCloseTo(0, 10);
    });

    it('should throw error for degenerate triangle', () => {
      const p0 = { x: 0, y: 0, z: 0 };
      const p1 = { x: 1, y: 0, z: 0 };
      const p2 = { x: 2, y: 0, z: 0 }; // Collinear points

      const point = { x: 0.5, y: 0, z: 0 };

      expect(() => GeometricUtils.cartesianToBarycentric3D(point, p0, p1, p2)).toThrow();
    });
  });

  describe('signedArea2D', () => {
    it('should return positive area for counter-clockwise triangle', () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 1, y: 0 };
      const p2 = { x: 0, y: 1 };

      const area = GeometricUtils.signedArea2D(p0, p1, p2);
      expect(area).toBeCloseTo(0.5, 10);
    });

    it('should return negative area for clockwise triangle', () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 0, y: 1 };
      const p2 = { x: 1, y: 0 };

      const area = GeometricUtils.signedArea2D(p0, p1, p2);
      expect(area).toBeCloseTo(-0.5, 10);
    });

    it('should return zero for degenerate triangle', () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 1, y: 0 };
      const p2 = { x: 2, y: 0 };

      const area = GeometricUtils.signedArea2D(p0, p1, p2);
      expect(area).toBeCloseTo(0, 10);
    });
  });

  describe('isConvexQuad', () => {
    it('should return true for a convex quadrilateral', () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 2, y: 0 };
      const p2 = { x: 2, y: 2 };
      const p3 = { x: 0, y: 2 };

      expect(GeometricUtils.isConvexQuad(p0, p1, p2, p3)).toBe(true);
    });

    it('should return false for a non-convex quadrilateral', () => {
      // Create a non-convex quadrilateral (chevron/arrow pointing left)
      // Going p0->p1->p2->p3, the turn at p2 is reflex (> 180 degrees)
      const p0 = { x: 0, y: 1 };
      const p1 = { x: 2, y: 0 };
      const p2 = { x: 1, y: 1 };
      const p3 = { x: 2, y: 2 };

      expect(GeometricUtils.isConvexQuad(p0, p1, p2, p3)).toBe(false);
    });

    it('should handle degenerate quadrilateral', () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 1, y: 0 };
      const p2 = { x: 2, y: 0 };
      const p3 = { x: 3, y: 0 };

      expect(GeometricUtils.isConvexQuad(p0, p1, p2, p3)).toBe(true); // Degenerate but all cross products are zero
    });
  });

  describe('circumcenter2D', () => {
    it('should compute circumcenter of equilateral triangle', () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 1, y: 0 };
      const p2 = { x: 0.5, y: Math.sqrt(3) / 2 };

      const center = GeometricUtils.circumcenter2D(p0, p1, p2);

      // Circumcenter should be equidistant from all vertices
      const dist0 = Math.sqrt(center.x ** 2 + center.y ** 2);
      const dist1 = Math.sqrt((center.x - 1) ** 2 + center.y ** 2);
      const dist2 = Math.sqrt((center.x - 0.5) ** 2 + (center.y - Math.sqrt(3) / 2) ** 2);

      expect(dist0).toBeCloseTo(dist1, 10);
      expect(dist1).toBeCloseTo(dist2, 10);
    });

    it('should throw error for degenerate triangle', () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 1, y: 0 };
      const p2 = { x: 2, y: 0 };

      expect(() => GeometricUtils.circumcenter2D(p0, p1, p2)).toThrow();
    });
  });
});
