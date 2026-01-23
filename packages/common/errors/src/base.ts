//
// Copyright 2025 DXOS.org
//

/**
 * Options for creating a BaseError.
 */
export type BaseErrorOptions = ErrorOptions & {
  /**
   * Override base message.
   */
  message?: string;

  /**
   * Structured details about the error.
   */
  context?: Record<string, unknown>;
};

/**
 * Base class for all DXOS errors.
 */
export class BaseError<Name extends string = string> extends Error {
  /**
   * Primary way of defining new error classes.
   * Extended class may specialize constructor for required context params.
   * @param name - Error name.
   * @param message - Default error message.
   */
  static extend<Name extends string = string>(name: Name, message?: string) {
    return class ExtendedError extends BaseError<Name> {
      static override name: Name = name;

      static is(error: unknown): error is BaseError {
        return typeof error === 'object' && error !== null && 'name' in error && error.name === name;
      }

      static wrap(
        options?: Omit<BaseErrorOptions, 'cause'> & { ifTypeDiffers?: boolean },
      ): (error: unknown) => ExtendedError {
        const wrapFn = (error: unknown) => {
          if (options?.ifTypeDiffers === true && this.is(error)) {
            return error as ExtendedError;
          }
          const newError: ExtendedError = new this({ message, ...options, cause: error });
          Error.captureStackTrace(newError, wrapFn); // Position stack-trace to start from the caller of `wrap`.
          return newError;
        };
        return wrapFn;
      }

      constructor(options?: BaseErrorOptions) {
        super(name, { message: options?.message ?? message, ...options });
      }
    };
  }

  // NOTE: Errors go through odd transformations and the private fields seem to break.
  override name: Name;
  context: Record<string, unknown>;

  constructor(name: Name, options?: BaseErrorOptions) {
    super(options?.message, { cause: options?.cause });

    this.name = name;
    this.context = options?.context ?? {};
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Fallback message. */
  override get message() {
    return this.constructor.name;
  }

  // For effect error matching.
  get _tag(): Name {
    return this.name;
  }
}
