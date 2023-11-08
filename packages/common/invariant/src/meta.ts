//
// Copyright 2023 DXOS.org
//

/**
 * Metadata injected b y the log transform plugin.
 *
 * Field names are intentionally short to reduce the size of the generated code.
 */
export interface CallMetadata {
  /**
   * File name.
   */
  F: string;

  /**
   * Line number.
   */
  L: number;

  /**
   * Value of `this` at the site of the log call.
   * Will be set to the class instance if the call is inside a method, or to the `globalThis` (`window` or `global`) otherwise.
   */
  S: any | undefined;

  /**
   * A callback that will invoke the provided function with provided arguments.
   * Useful in the browser to force a `console.log` call to have a certain stack-trace.
   */
  C?: (fn: Function, args: any[]) => void;

  /**
   * Source code of the argument list.
   */
  A?: string[];
}
