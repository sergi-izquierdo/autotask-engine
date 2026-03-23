/**
 * Discriminated union Result type for error handling without exceptions.
 */

interface OkResult<T> {
  readonly ok: true;
  readonly value: T;
}

interface ErrResult<E> {
  readonly ok: false;
  readonly error: E;
}

export type Result<T, E = Error> = OkResult<T> | ErrResult<E>;

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is OkResult<T> {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is ErrResult<E> {
  return !result.ok;
}
