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

      constructor(message: string, context?: Record<string, unknown>, options?: ErrorOptions) {
        super(code, message, context, options);
      }
    };
  }

  #code: string;
  #context: Record<string, unknown>;

  constructor(code: string, message: string, { cause, ...context }: Record<string, unknown> = {}) {
    super(message, { cause });

    this.#code = code;
    this.#context = context;
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
