/**
 * Poll a function until a condition is met or timeout is reached.
 */
export async function poll<T>(
  fn: () => Promise<T>,
  predicate: (result: T) => boolean,
  options: { interval?: number; timeout?: number } = {},
): Promise<T> {
  const { interval = 1_000, timeout = 30_000 } = options;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const result = await fn();
    if (predicate(result)) return result;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`poll() timed out after ${timeout}ms`);
}
