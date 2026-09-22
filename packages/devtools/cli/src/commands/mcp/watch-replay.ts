//
// Copyright 2026 DXOS.org
//

/** A single JSON-RPC message. Only the routing fields are read; everything else passes through. */
export type Frame = {
  id?: string | number;
  method?: string;
  params?: {
    requestId?: string | number;
    notifications?: Partial<Record<'toolsListChanged' | 'promptsListChanged' | 'resourcesListChanged', boolean>>;
    _meta?: { 'io.modelcontextprotocol/subscriptionId'?: string | number };
  };
};

/** What a replay may do to the connection the supervisor holds. */
export type ReplayIo = {
  /** Writes a client-originated frame into the current child verbatim, without recording it as pending. */
  toChild(frame: Frame): void;
  /** Writes a JSON-RPC 2.0 notification to the client; the envelope is added here. */
  notifyClient(method: string, params: NonNullable<Frame['params']>): void;
  // TODO(wittjosiah): Remove when dx mcp serve drops 2025-era MCP support.
  /** Queues client traffic until `release`. */
  hold(): void;
  // TODO(wittjosiah): Remove when dx mcp serve drops 2025-era MCP support.
  /** Delivers the traffic queued since `hold`. */
  release(): void;
};

/** Client state that has to survive a reload of the child. */
export type ReloadReplay = {
  /** Sees every client frame before it is forwarded or queued. */
  observeClient(frame: Frame): void;
  /** Pending ids a reload must not answer with the restart error. */
  retains(id: string | number): boolean;
  /** Runs after stranded requests are errored. */
  onReload(io: ReplayIo): void;
  /** Sees each child line's frames; 'consumed' drops the line. */
  onChild(frames: readonly Frame[], io: ReplayIo): 'consumed' | 'forward';
};
