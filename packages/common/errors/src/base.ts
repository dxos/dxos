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
export class BaseError<Code extends string = string> extends Error {
  /**
   * Primary way of defining new error classes.
   * Extended class may specialize constructor for required context params.
   * @param code - Error code.
   * @param message - Default error message.
   */
  static extend<Code extends string = string>(code: Code, message?: string) {
    return class extends BaseError<Code> {
      static code = code;

      static is(error: unknown): error is BaseError {
        return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
      }

      static wrap(options?: Omit<BaseErrorOptions, 'cause'> & { ifTypeDiffers?: boolean }) {
        return (error: unknown) => {
          if (options?.ifTypeDiffers === true && this.is(error)) {
            return error;
          }
          return new this({ message, ...options, cause: error });
        };
      }

      constructor(options?: BaseErrorOptions) {
        super(code, { message: options?.message ?? message, ...options });
      }
    };
  }

  // NOTE: Errors go through odd transformations and the private fields seem to break.
  code: Code;
  context: Record<string, unknown>;

  constructor(code: Code, options?: BaseErrorOptions) {
    super(options?.message, { cause: options?.cause });

    this.code = code;
    this.context = options?.context ?? {};
    Object.setPrototypeOf(this, new.target.prototype);
  }

  override get name() {
    return this.code;
  }

  /** Fallback message. */
  override get message() {
    return this.constructor.name;
  }

  // For effect error matching.
  get _tag(): Code {
    return this.code;
  }
}
