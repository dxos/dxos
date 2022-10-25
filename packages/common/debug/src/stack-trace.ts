//
// Copyright 2021 DXOS.org
//

/**
 * Allows to capture stack-traces.
 *
 * Will capture the stack trace at the point where the class is created.
 * Stack traces are captured lazily only when `getStack` is called.
 *
 * Stack traces are expesive to capture so only call getStack when you need them.
 */
export class StackTrace {
  private _stack: Error;

  constructor() {
    this._stack = new Error();
  }

  /**
   * Get stack formatted as string.
   *
   * @param skipFrames Number of frames to skip. By default the first frame would be the invocation of the StackTrace constructor.
   * @returns
   */
  getStack(skipFrames = 0) {
    const stack = this._stack.stack!.split('\n');
    return stack.slice(skipFrames + 2).join('\n');
  }
}
