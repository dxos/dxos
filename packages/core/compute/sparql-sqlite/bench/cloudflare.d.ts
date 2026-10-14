//
// Copyright 2026 DXOS.org
//

// The subset of `@cloudflare/workers-types` the bench worker touches, so the package needs no workers toolchain.

declare module 'cloudflare:workers' {
  export abstract class DurableObject<Env = unknown> {
    protected readonly ctx: DurableObjectState;
    protected readonly env: Env;
    constructor(ctx: DurableObjectState, env: Env);
  }
}

interface DurableObjectState {
  readonly storage: {
    readonly sql: import('../src/index.ts').SqlStorage & { readonly databaseSize: number };
    transactionSync<T>(closure: () => T): T;
  };
  abort(reason?: string): void;
}

interface DurableObjectId {}

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): { fetch(request: Request): Promise<Response> };
}
