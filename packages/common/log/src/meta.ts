//
// Copyright 2023 DXOS.org
//

/**
 * Metadata injected b y the log transform plugin.
 */
export interface CallMetadata {
  /**
   * File name.
   */
  file: string;

  /**
   * Line number.
   */
  line: number;

  /**
   * Value of `this` at the site of the log call.
   * Will be set to the class instance if the call is inside a method, or to the `globalThis` (`window` or `global`) otherwise.
   */
  scope: any | undefined;

  // Useful for pre-processor hook debugging.
  bugcheck?: string;

  /**
   * A callback that will invoke the provided function with provided arguments.
   * Useful in the browser to force a `console.log` call to have a certain stack-trace.
   */
  callSite?: (fn: Function, args: any[]) => void;

  /**
   * Source code of the argument list.
   */
  args?: string[];
}