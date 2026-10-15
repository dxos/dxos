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
  text(): Promise<string>;
};

/** The part of the R2 binding the worker uses. */
export type Bucket = {
  get(key: string, options?: { range?: { offset: number; length?: number } }): Promise<BucketObject | null>;
  head(key: string): Promise<object | null>;
  put(key: string, value: Uint8Array | string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
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
  fetch(request: Request, env: Env, ctx: { waitUntil(promise: Promise<unknown>): void }): Promise<Response>;
};
export default worker;

export declare const requestToSexp: (request: InboxRequest) => string;
export declare const sexpToRequest: (source: string) => InboxRequest;
export declare const quote: (value: string) => string;
