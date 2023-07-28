//
// Copyright 2023 DXOS.org
//

export type FunctionInvocation = {
  function: string;

  /**
   * Runtime name.
   * Example: dev, faas
   */
  runtime: string;

  /**
   * Domain-specific event.
   */
  event: any;
};

export type FunctionInvocationResult = {
  status: number;
  response: string;
};

export interface FunctionDispatcher {
  invoke(invocation: FunctionInvocation): Promise<FunctionInvocationResult>;
}
