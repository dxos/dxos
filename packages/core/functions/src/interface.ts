import { Client } from "@dxos/client";

export interface FunctionContext {
  client: Client;

  status (code: number): Reply;
}

export interface Reply {
  status (code: number): Reply;
  succeed (data: any): Reply;
}

export interface FunctionHandler {
  (event: any, context: FunctionContext): Promise<Reply>;
}