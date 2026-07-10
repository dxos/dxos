//
// Copyright 2021 DXOS.org
//

export * from './automerge.ts';
export * from './edge/index.ts';
export * from './effect-runtime.ts';
export * from './errors/index.ts';
export * from './rpc-bridge.ts';
export * from './indexing.ts';
export * from './messenger.ts';
export * from './profile-archive.ts';
export * from './space-archive.ts';
export * from './storage.ts';
export type * from './types.ts';
export * as Config2 from './Config2.ts';
export * as FunctionProtocol from './FunctionProtocol.ts';
export * as FeedProtocol from './FeedProtocol.ts';
export * as TraceProtocol from './TraceProtocol.ts';

// Effect RPC service definitions are exported from the `@dxos/protocols/rpc` subpath, not this
// barrel: they transitively load the protobufjs-backed proto codec, which must not leak into
// edge/workerd bundles that only consume the proto types or error classes from this barrel.
