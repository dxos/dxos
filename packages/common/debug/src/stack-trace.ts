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
/**
 * Whether a `stack` line is a frame rather than a header.
 *
 * V8 prefixes the frames with the error's own header line (`Error`), JavaScriptCore — Safari, and
 * tauri's WKWebView — emits no header and starts at the first frame, so the number of lines before
 * the first frame is engine-dependent and cannot be a constant. Matching an `@` anywhere is safe
 * only because the captured error is always message-less, so a header is never more than `Error`.
 */
const isFrameLine = (line: string): boolean => /^\s*at\s/.test(line) || line.includes('@');

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
    const frames = this._format();
    // The header, when the engine emits one, plus this class's own constructor frame.
    const headerOffset = frames.length > 0 && !isFrameLine(frames[0]) ? 1 : 0;
    return frames.slice(headerOffset + skipFrames + 1);
  }
}
