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

export class BaseError extends Error {
  static extend(code: string) {
    return class extends BaseError {
      static code = code;

      static is(error: unknown): error is BaseError {
        return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
      }

      constructor(message: string, options?: BaseErrorOptions) {
        super(code, message, options);
      }
    };
  }

  #code: string;
  #context: Record<string, unknown>;

  constructor(code: string, message: string, options?: BaseErrorOptions) {
    super(message, options);

    this.#code = code;
    this.#context = options?.context ?? {};
    Object.setPrototypeOf(this, new.target.prototype);
  }

  override get name() {
    return this.#code;
  }

  get code() {
    return this.#code;
  }

  get context() {
    return this.#context;
  }
}
