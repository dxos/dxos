//
// Copyright 2024 DXOS.org
//

import type { HonoRequest } from 'hono';

// TODO(burdon): Standardize POST API (event, state).
//  https://effect.website/docs/guides/essentials/pipeline
//  https://developers.cloudflare.com/reference-architecture/diagrams/serverless/serverless-etl/
//  Queue, Worker, Storage, AI, RAG, Fetcher.
export type FunctionEvent<T extends {}> = {
  debug?: boolean;
  data?: T;
};

/**
 * Safely parse JSON data from the request with default value.
 */
export const safeJson: {
  <T>(req: HonoRequest): Promise<T | undefined>;
  <T>(req: HonoRequest, defaultValue: T): Promise<T>;
} = async <T>(req: HonoRequest, defaultValue?: T): Promise<T | undefined> => {
  try {
    return await req.json();
  } catch {
    return defaultValue;
  }
};

export const str = (...text: string[]) => text.join(' ');
