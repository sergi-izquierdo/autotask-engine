import { describe, expect, it } from "vitest";
import { err, isErr, isOk, ok, type Result } from "../result.js";
import { ValidationError, ErrorCode } from "../errors.js";

describe("ok()", () => {
  it("creates a successful result", () => {
    const result = ok(42);

    expect(result.ok).toBe(true);
    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
    if (isOk(result)) {
      expect(result.value).toBe(42);
    }
  });

  it("works with complex values", () => {
    const result = ok({ id: "1", name: "test" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({ id: "1", name: "test" });
    }
  });
});

describe("err()", () => {
  it("creates an error result", () => {
    const error = new Error("something went wrong");
    const result = err(error);

    expect(result.ok).toBe(false);
    expect(isErr(result)).toBe(true);
    expect(isOk(result)).toBe(false);
    if (isErr(result)) {
      expect(result.error).toBe(error);
    }
  });

  it("works with AppError subclasses", () => {
    const error = new ValidationError("bad", "field");
    const result = err(error);

    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });
});

describe("Result type narrowing", () => {
  function divide(a: number, b: number): Result<number, string> {
    if (b === 0) return err("division by zero");
    return ok(a / b);
  }

  it("narrows to OkResult with isOk", () => {
    const result = divide(10, 2);
    if (isOk(result)) {
      expect(result.value).toBe(5);
    } else {
      throw new Error("expected ok");
    }
  });

  it("narrows to ErrResult with isErr", () => {
    const result = divide(10, 0);
    if (isErr(result)) {
      expect(result.error).toBe("division by zero");
    } else {
      throw new Error("expected err");
    }
  });
});
