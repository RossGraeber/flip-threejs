import { describe, it, expect } from 'vitest';
import { Vector2 } from '../../../src/geometry/Vector2';

describe('Vector2', () => {
  describe('constructor', () => {
    it('should create vector with given coordinates', () => {
      const v = new Vector2(3, 4);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const v1 = new Vector2(1, 2);
      const v2 = v1.clone();

      expect(v2.x).toBe(1);
      expect(v2.y).toBe(2);
      expect(v2).not.toBe(v1);
    });
  });

  describe('add', () => {
    it('should add two vectors', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(3, 4);
      const result = v1.add(v2);

      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });
  });

  describe('subtract', () => {
    it('should subtract two vectors', () => {
      const v1 = new Vector2(5, 7);
      const v2 = new Vector2(2, 3);
      const result = v1.subtract(v2);

      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });
  });

  describe('multiplyScalar', () => {
    it('should multiply vector by scalar', () => {
      const v = new Vector2(2, 3);
      const result = v.multiplyScalar(3);

      expect(result.x).toBe(6);
      expect(result.y).toBe(9);
    });
  });

  describe('divideScalar', () => {
    it('should divide vector by scalar', () => {
      const v = new Vector2(6, 9);
      const result = v.divideScalar(3);

      expect(result.x).toBe(2);
      expect(result.y).toBe(3);
    });

    it('should throw error when dividing by zero', () => {
      const v = new Vector2(1, 2);
      expect(() => v.divideScalar(0)).toThrow();
    });
  });

  describe('dot', () => {
    it('should compute dot product', () => {
      const v1 = new Vector2(2, 3);
      const v2 = new Vector2(4, 5);
      const result = v1.dot(v2);

      expect(result).toBe(2 * 4 + 3 * 5);
    });

    it('should return zero for perpendicular vectors', () => {
      const v1 = new Vector2(1, 0);
      const v2 = new Vector2(0, 1);

      expect(v1.dot(v2)).toBe(0);
    });
  });

  describe('cross', () => {
    it('should compute 2D cross product', () => {
      const v1 = new Vector2(2, 3);
      const v2 = new Vector2(4, 5);
      const result = v1.cross(v2);

      expect(result).toBe(2 * 5 - 3 * 4);
    });

    it('should return zero for parallel vectors', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(2, 4);

      expect(v1.cross(v2)).toBeCloseTo(0, 10);
    });
  });

  describe('length', () => {
    it('should compute vector length', () => {
      const v = new Vector2(3, 4);
      expect(v.length()).toBe(5);
    });

    it('should return zero for zero vector', () => {
      const v = Vector2.zero();
      expect(v.length()).toBe(0);
    });
  });

  describe('lengthSquared', () => {
    it('should compute squared length', () => {
      const v = new Vector2(3, 4);
      expect(v.lengthSquared()).toBe(25);
    });
  });

  describe('normalize', () => {
    it('should create unit vector', () => {
      const v = new Vector2(3, 4);
      const normalized = v.normalize();

      expect(normalized.length()).toBeCloseTo(1, 10);
      expect(normalized.x).toBeCloseTo(3 / 5, 10);
      expect(normalized.y).toBeCloseTo(4 / 5, 10);
    });

    it('should throw error for zero vector', () => {
      const v = Vector2.zero();
      expect(() => v.normalize()).toThrow();
    });
  });

  describe('distanceTo', () => {
    it('should compute distance between vectors', () => {
      const v1 = new Vector2(0, 0);
      const v2 = new Vector2(3, 4);

      expect(v1.distanceTo(v2)).toBe(5);
    });
  });

  describe('angle', () => {
    it('should compute angle from positive x-axis', () => {
      const v1 = new Vector2(1, 0);
      expect(v1.angle()).toBeCloseTo(0, 10);

      const v2 = new Vector2(0, 1);
      expect(v2.angle()).toBeCloseTo(Math.PI / 2, 10);

      const v3 = new Vector2(-1, 0);
      expect(v3.angle()).toBeCloseTo(Math.PI, 10);

      const v4 = new Vector2(0, -1);
      expect(v4.angle()).toBeCloseTo(-Math.PI / 2, 10);
    });
  });

  describe('angleTo', () => {
    it('should compute angle between two vectors', () => {
      const v1 = new Vector2(1, 0);
      const v2 = new Vector2(0, 1);

      expect(v1.angleTo(v2)).toBeCloseTo(Math.PI / 2, 10);
    });

    it('should return zero for parallel vectors', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(2, 4);

      expect(v1.angleTo(v2)).toBeCloseTo(0, 10);
    });

    it('should throw error for zero vector', () => {
      const v1 = new Vector2(1, 0);
      const v2 = Vector2.zero();

      expect(() => v1.angleTo(v2)).toThrow();
    });
  });

  describe('rotate', () => {
    it('should rotate vector by 90 degrees', () => {
      const v = new Vector2(1, 0);
      const rotated = v.rotate(Math.PI / 2);

      expect(rotated.x).toBeCloseTo(0, 10);
      expect(rotated.y).toBeCloseTo(1, 10);
    });

    it('should rotate vector by 180 degrees', () => {
      const v = new Vector2(1, 0);
      const rotated = v.rotate(Math.PI);

      expect(rotated.x).toBeCloseTo(-1, 10);
      expect(rotated.y).toBeCloseTo(0, 10);
    });
  });

  describe('equals', () => {
    it('should return true for equal vectors', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(1, 2);

      expect(v1.equals(v2)).toBe(true);
    });

    it('should return false for different vectors', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(1, 3);

      expect(v1.equals(v2)).toBe(false);
    });

    it('should handle epsilon tolerance', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(1.000001, 2.000001);

      expect(v1.equals(v2, 1e-5)).toBe(true);
      expect(v1.equals(v2, 1e-10)).toBe(false);
    });
  });

  describe('static fromPolar', () => {
    it('should create vector from polar coordinates', () => {
      const v = Vector2.fromPolar(5, 0);
      expect(v.x).toBeCloseTo(5, 10);
      expect(v.y).toBeCloseTo(0, 10);

      const v2 = Vector2.fromPolar(5, Math.PI / 2);
      expect(v2.x).toBeCloseTo(0, 10);
      expect(v2.y).toBeCloseTo(5, 10);
    });
  });

  describe('static zero', () => {
    it('should create zero vector', () => {
      const v = Vector2.zero();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });
  });

  describe('static unitX', () => {
    it('should create unit vector along x-axis', () => {
      const v = Vector2.unitX();
      expect(v.x).toBe(1);
      expect(v.y).toBe(0);
    });
  });

  describe('static unitY', () => {
    it('should create unit vector along y-axis', () => {
      const v = Vector2.unitY();
      expect(v.x).toBe(0);
      expect(v.y).toBe(1);
    });
  });
});
