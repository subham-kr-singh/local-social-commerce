export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors: unknown[];
  public readonly success: false = false;

  constructor(statusCode: number, message: string, errors: unknown[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = "ApiError";

    // Restore prototype chain (needed when extending built-ins in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
