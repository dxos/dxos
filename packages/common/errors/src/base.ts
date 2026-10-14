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

      /**
       * Name equality, not an `instanceof`, so an error rebuilt from the wire still matches.
       * A subclass that renames itself therefore does NOT match its parent, so define
       * siblings rather than a renaming subclass.
       */
      static is(error: unknown): error is BaseError {
        return typeof error === 'object' && error !== null && 'name' in error && error.name === name;
      }

      /**
       * Returns a `catch`/`mapError` callback that wraps a thrown value in this class.
       * @param options.ifTypeDiffers - Pass an error of this class through untouched.
       */
      static wrap(
        options?: Omit<BaseErrorOptions, 'cause'> & { ifTypeDiffers?: boolean },
      ): (error: unknown) => ExtendedError {
        const wrapFn = (error: unknown) => {
          if (options?.ifTypeDiffers === true && (this.is(error) || error instanceof this)) {
            return error as ExtendedError;
          }
          const newError: ExtendedError = new this({
            context: options?.context,
            message: options?.message ?? messageOf(error) ?? message,
            cause: error,
          });
          Error.captureStackTrace(newError, wrapFn); // Position stack-trace to start from the caller of `wrap`.
          return newError;
        };
        return wrapFn;
      }

      constructor(options?: BaseErrorOptions) {
        super(name, { cause: options?.cause, context: options?.context, message: options?.message ?? message });
      }
    };
  }

  // NOTE: Errors go through odd transformations and the private fields seem to break.
  override name: Name;
  context: Record<string, unknown>;

  constructor(name: Name, options?: BaseErrorOptions) {
    let message = options?.message;
    if (message && options?.context && Object.keys(options.context).length > 0) {
      message += `: ${JSON.stringify(options?.context)}`;
    }

    super(message, { cause: options?.cause });

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

/**
 * The message carried by a thrown value.
 *
 * Duck-types `message` rather than testing `instanceof Error`, so a cross-realm error or a
 * rejected error-shaped object reads the same as a local one, matching how `encodeError`
 * in `@dxos/protocols` decides what to put on the wire.
 */
export const messageOf = (error: unknown): string | undefined => {
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error as { message?: unknown };
    return typeof message === 'string' ? message : undefined;
  }
  return undefined;
};
