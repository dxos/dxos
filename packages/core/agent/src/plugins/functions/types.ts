//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Request/Response.
export type FunctionInvocation = {
  route: string;

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
