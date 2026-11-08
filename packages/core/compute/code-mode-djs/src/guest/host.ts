//
// Copyright 2026 DXOS.org
//

import { type Outcome, type Row, type WriteRecord } from '../protocol.ts';

/**
 * The bridge as the guest sees it. Every call but `invoke`, `tool` and `sleep` is synchronous here: the VM parks at the
 * call until the host answers, even when the host answers with a promise.
 */
export interface GuestHost {
  query(ast: unknown): Row[];
  load(uri: string): Row | null;
  /** Applies the records and answers each written object's new version, by id; `durable` also flushes the host. */
  write(records: WriteRecord[], durable: boolean): Record<string, string>;
  /** Rows for the objects whose host version differs from `versions`, and the ids the host no longer has. */
  refresh(versions: Record<string, string>): { rows: Row[]; removed: string[] };
  /** Asynchronous, so a program can run several at once. */
  invoke(key: string, input: unknown): Promise<Outcome>;
  tool(name: string, input: unknown): Promise<Outcome>;
  print(values: unknown[]): void;
  sleep(ms: number): Promise<void>;
}

// Bound by the host under `dx.*` (see `HostFunction`).
declare const dx: GuestHost;

/** The host functions, read when called so a module can be loaded before the host binds them. */
export const host = (): GuestHost => dx;
