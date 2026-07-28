//
// Copyright 2021 DXOS.org
//

/**
 * Will capture the stack trace at the point where the class is created.
 * Stack traces are formatted lazily only when `getStack` is called.
 * Formatting is significantly more expensive than capture so only call getStack when you need them.
 *
 * IMPORTANT: a trace that has never been formatted keeps its entire capture site reachable. V8 holds
 * the captured frames structurally until `Error.prototype.stack` is read, and every frame holds a
 * strong reference to that frame's receiver — so retaining an unformatted `StackTrace` retains the
 * `this` of each function that was on the stack at capture time. Records that outlive their capture
 * site (diagnostics, registries, caches) must therefore store the formatted string rather than the
 * `StackTrace` itself. Keeping one in a never-pruned module-level container leaked an entire ECHO
 * client graph per query on Cloudflare Workers, where nothing ever reads the diagnostics (DX-1140).
 */
export class StackTrace {
  private _error: Error | undefined;
  private _frames: string[] | undefined;

  // NOTE: Captured in the constructor body, not a field initializer — an initializer adds its own
  // frame, which would shift the `skipFrames` offsets every caller passes.
  constructor() {
    this._error = new Error();
  }

  /**
   * Formats on first use, then releases the captured frames — and with them the capture site.
   *
   * The `Error` is dropped before formatting, not after: releasing the capture site is the whole
   * point, so it must not be contingent on `stack` being present or `split` succeeding.
   */
  private _format(): string[] {
    if (!this._frames) {
      const error = this._error;
      this._error = undefined;
      this._frames = error?.stack?.split('\n') ?? [];
    }
    return this._frames;
  }

  /**
   * Get stack formatted as string.
   * @param skipFrames Number of frames to skip. By default, the first frame would be the invocation of the StackTrace constructor.
   * @returns
   */
  getStack(skipFrames = 0): string {
    return this.getStackArray(skipFrames).join('\n');
  }

  getStackArray(skipFrames = 0): string[] {
    return this._format().slice(skipFrames + 2);
  }
}
