//
// Copyright 2026 DXOS.org
//

/** An R2 object as the worker reads it. */
export type BucketObject = {
  body: ReadableStream | Uint8Array | string;
  httpMetadata?: { contentType?: string };
  text(): Promise<string>;
};

/** The part of the R2 binding the worker uses. */
export type Bucket = {
  get(key: string): Promise<BucketObject | null>;
  head(key: string): Promise<object | null>;
  put(key: string, value: Uint8Array | string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  list(options: { prefix: string }): Promise<{ objects: { key: string }[] }>;
};

export type Env = {
  ORIGIN: string;
  PREFIX?: string;
  GITHUB_ORG?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
  GITHUB_OAUTH_URL?: string;
  GITHUB_API_URL?: string;
  BUCKET?: Bucket;
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
