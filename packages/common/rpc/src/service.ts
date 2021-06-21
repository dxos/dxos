import { Service, ServiceDescriptor } from "@dxos/codec-protobuf";

export interface RpcLifecycle {
  open(): Promise<void>
  close(): void
}

export function createRpcClient<S>(serviceDef: ServiceDescriptor<S>): Service & S & RpcLifecycle {
  const 
} 
