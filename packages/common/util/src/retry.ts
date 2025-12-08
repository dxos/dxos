export interface RetryOptions<T> {
  /**
   * @default 3
   */
  count?: number;

  /**
   * @default 100
   */
  delayMs?: number;

  /**
   * Factor to increase delay by.
   * @default 2
   */
  exponent?: number;

  /**
   * Retry if error matches the predicate.
   * @default () => true
   */
  retryOnError?: (error: unknown) => Promise<boolean>;

  /**
   * Retry if value matches the predicate.
   * @default () => false
   */
  retryOnValue?: (value: T) => Promise<boolean>;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions<unknown>> = {
  count: 3,
  delayMs: 100,
  exponent: 2,
  retryOnError: async () => true,
  retryOnValue: async () => false,
};

/**
 * Retries the operation a number of times.
 * @returns The result of the succesfull invocation
 * @throws Last error if all retries failed
 */
export const retry = async <T>(options: RetryOptions<T>, cb: () => Promise<T>): Promise<T> => {
  const fullOptions: Required<RetryOptions<T>> = { ...DEFAULT_RETRY_OPTIONS, ...options };

  let numRetries = 0,
    currentDelay = fullOptions.delayMs;
  while (true) {
    let result: T;
    try {
      result = await cb();
    } catch (err) {
      if (numRetries > fullOptions.count || !(await fullOptions.retryOnError(err))) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= fullOptions.exponent;
      numRetries++;
      continue;
    }
    if (!(await fullOptions.retryOnValue(result))) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, currentDelay));
    currentDelay *= fullOptions.exponent;
    numRetries++;
    continue;
  }
};
