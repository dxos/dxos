//
// Copyright 2026 DXOS.org
//

/** An R2 object as the worker reads it. */
export type BucketObject = {
  body: ReadableStream | Uint8Array | string;
  httpMetadata?: { contentType?: string };
  /** The stored size, and for a ranged read the bytes returned (packs, D180). */
  size?: number;
  range?: { offset: number; length: number };
  /** When it was written: a branch head's age decides whether the explorer still shows the last drawn head. */
  uploaded?: Date;
  text(): Promise<string>;
};

/** The part of the R2 binding the worker uses. */
export type Bucket = {
  get(key: string, options?: { range?: { offset: number; length?: number } }): Promise<BucketObject | null>;
  head(key: string): Promise<object | null>;
  /** `onlyIf` makes the write conditional as R2 does: `If-None-Match: *` creates only, `etagMatches` replaces only that version. */
  put(
    key: string,
    value: Uint8Array | string,
    options?: { httpMetadata?: { contentType?: string }; onlyIf?: Headers | { etagMatches?: string } },
  ): Promise<unknown>;
  delete(key: string): Promise<unknown>;
  list(options: {
    prefix: string;
    cursor?: string;
  }): Promise<{ objects: { key: string }[]; truncated?: boolean; cursor?: string }>;
};

/** The part of the D1 binding the worker uses. */
export type Statement = {
  bind(...values: (string | number | null)[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta?: { changes?: number } }>;
};

export type Database = {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown>;
};

export type Env = {
  /** The project whose explorer is served at `/`. */
  PREFIX?: string;
  /** `0` skips checking that a pushed bundle hashes to its name. */
  VERIFY_BUNDLES?: string;
  GITHUB_ORG?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
  GITHUB_OAUTH_URL?: string;
  GITHUB_API_URL?: string;
  BUCKET?: Bucket;
  DB?: Database;
  /** KV in front of the bucket: shown heads for a minute, drawn explorer pages for a week. */
  CACHE?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<unknown>;
  };
  /** `deus-live`: projects whose pushed head the queue consumer draws (D192). */
  LIVE_QUEUE?: {
    send(body: { project: string }): Promise<void>;
    sendBatch?(messages: { body: { project: string; causal: string; from: number; count: number } }[]): Promise<void>;
  };
};

export type InboxAsset = { hash: string; type: string; name: string };

export type InboxRequest = {
  kind?: string;
  by?: string;
  at?: string;
  subject?: string;
  note?: string;
  title?: string;
  details?: string;
  link?: string;
  labels?: string;
  task?: string;
  assets: InboxAsset[];
};

declare const worker: {
  queue(
    batch: { messages: { body: object; ack(): void }[] },
    env: Env,
    ctx: { waitUntil(promise: Promise<unknown>): void },
  ): Promise<void>;
  fetch(request: Request, env: Env, ctx: { waitUntil(promise: Promise<unknown>): void }): Promise<Response>;
};
export default worker;

export declare const requestToSexp: (request: InboxRequest) => string;
export declare const sexpToRequest: (source: string) => InboxRequest;
export declare const quote: (value: string) => string;
