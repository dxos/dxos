//
// Copyright 2025 DXOS.org
//

export type BaseErrorOptions = {
  /**
   * The cause of the error.
   * An instance of Error.
   */
  cause?: unknown;

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
   *
   * Expample:
   *
   * ```ts
   * export class AiInputPreprocessingError extends BaseError.extend('AI_INPUT_PREPROCESSING_ERROR') {}
   * ```
   */
  static extend<Code extends string>(code: Code) {
    return class extends BaseError<Code> {
      static code = code;

      static is(error: unknown): error is BaseError {
        return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
      }

      constructor(message: string, options?: BaseErrorOptions) {
        super(code, message, options);
      }
    };
  }

  #code: Code;
  #context: Record<string, unknown>;

  constructor(code: Code, message: string, options?: BaseErrorOptions) {
    super(message, options);

    this.#code = code;
    this.#context = options?.context ?? {};
    Object.setPrototypeOf(this, new.target.prototype);
  }

  override get name() {
    return this.#code;
  }

  get code(): Code {
    return this.#code;
  }

  // For effect error matching.
  get _tag(): Code {
    return this.#code;
  }

  get context() {
    return this.#context;
  }
}
