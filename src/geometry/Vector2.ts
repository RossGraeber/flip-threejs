/**
 * A 2D vector class for geometric computations.
 * Used primarily for laying out triangles in the plane during edge flips.
 */
export class Vector2 {
  constructor(
    public x: number,
    public y: number
  ) {}

  /**
   * Creates a copy of this vector.
   */
  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  /**
   * Adds another vector to this one and returns a new vector.
   */
  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  /**
   * Subtracts another vector from this one and returns a new vector.
   */
  subtract(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  /**
   * Multiplies this vector by a scalar and returns a new vector.
   */
  multiplyScalar(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  /**
   * Divides this vector by a scalar and returns a new vector.
   */
  divideScalar(scalar: number): Vector2 {
    if (scalar === 0) {
      throw new Error('Cannot divide vector by zero');
    }
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  /**
   * Computes the dot product with another vector.
   */
  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * Computes the 2D cross product (z-component of 3D cross product).
   * Returns a scalar representing the signed area of the parallelogram.
   */
  cross(v: Vector2): number {
    return this.x * v.y - this.y * v.x;
  }

  /**
   * Computes the length (magnitude) of this vector.
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Computes the squared length of this vector (avoids sqrt).
   */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Returns a normalized copy of this vector (length = 1).
   * Throws if the vector has zero length.
   */
  normalize(): Vector2 {
    const len = this.length();
    if (len === 0) {
      throw new Error('Cannot normalize zero-length vector');
    }
    return this.divideScalar(len);
  }

  /**
   * Computes the distance to another vector.
   */
  distanceTo(v: Vector2): number {
    return this.subtract(v).length();
  }

  /**
   * Computes the squared distance to another vector (avoids sqrt).
   */
  distanceToSquared(v: Vector2): number {
    return this.subtract(v).lengthSquared();
  }

  /**
   * Computes the angle of this vector in radians (from positive x-axis).
   */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Computes the angle between this vector and another in radians.
   */
  angleTo(v: Vector2): number {
    const denominator = Math.sqrt(this.lengthSquared() * v.lengthSquared());
    if (denominator === 0) {
      throw new Error('Cannot compute angle with zero-length vector');
    }
    const cosine = this.dot(v) / denominator;
    // Clamp to handle floating point errors
    return Math.acos(Math.max(-1, Math.min(1, cosine)));
  }

  /**
   * Rotates this vector by an angle in radians and returns a new vector.
   */
  rotate(angleRadians: number): Vector2 {
    const cos = Math.cos(angleRadians);
    const sin = Math.sin(angleRadians);
    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  /**
   * Checks if this vector equals another within a tolerance.
   */
  equals(v: Vector2, epsilon: number = 1e-10): boolean {
    return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
  }

  /**
   * Returns a string representation of this vector.
   */
  toString(): string {
    return `Vector2(${this.x}, ${this.y})`;
  }

  /**
   * Creates a vector from polar coordinates.
   */
  static fromPolar(length: number, angle: number): Vector2 {
    return new Vector2(length * Math.cos(angle), length * Math.sin(angle));
  }

  /**
   * Creates a zero vector.
   */
  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  /**
   * Creates a unit vector along the x-axis.
   */
  static unitX(): Vector2 {
    return new Vector2(1, 0);
  }

  /**
   * Creates a unit vector along the y-axis.
   */
  static unitY(): Vector2 {
    return new Vector2(0, 1);
  }
}
