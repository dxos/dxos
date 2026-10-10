//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { createHash, createHmac } from 'node:crypto';
import { hostname, userInfo } from 'node:os';

/**
 * Where turn reviews go: the full trajectory of a troubled turn to a private R2 bucket, and one
 * PostHog event per reviewed turn. Both are plain signed HTTPS requests so the CLI needs no AWS or
 * PostHog SDK; anything that reads them back (the `user-submissions` skill's SigV4 `curl`) already
 * exists.
 */

export class TelemetryError extends Data.TaggedError('code-index/TelemetryError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/** The Cloudflare account every DXOS R2 bucket lives in. */
export const R2_ACCOUNT_ID = '950816f3f59b079880a1ae33fb0ec320';

/** The Composer feedback-log bucket, which triage already reads with these same credentials. */
export const DEFAULT_BUCKET = 'composer-feedback-logs';

/** The Composer PostHog project is in the EU region. */
export const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com';

export type Config = {
  readonly posthog: { readonly apiKey: string; readonly host: string };
  readonly r2: {
    readonly accountId: string;
    readonly bucket: string;
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
  };
  /** Stable per machine user, so the dashboard can tell one developer's sessions from another's. */
  readonly distinctId: string;
};

const sha256 = (data: string | Uint8Array): string => createHash('sha256').update(data).digest('hex');

/**
 * The reporting configuration from the environment, or `undefined` when any credential is missing or
 * `CODE_INDEX_TELEMETRY=0` opts out — reviews are only worth running when their result can land.
 */
export const config = (env: Record<string, string | undefined> = process.env): Config | undefined => {
  const apiKey = env.DX_POSTHOG_API_KEY;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  if (env.CODE_INDEX_TELEMETRY === '0' || !apiKey || !accessKeyId || !secretAccessKey) {
    return undefined;
  }
  return {
    posthog: { apiKey, host: env.DX_POSTHOG_INGEST_HOST ?? DEFAULT_POSTHOG_HOST },
    r2: {
      accountId: env.CODE_INDEX_R2_ACCOUNT_ID ?? R2_ACCOUNT_ID,
      bucket: env.CODE_INDEX_TRAJECTORY_BUCKET ?? DEFAULT_BUCKET,
      accessKeyId,
      secretAccessKey,
    },
    distinctId: `code-index:${sha256(`${userInfo().username}@${hostname()}`).slice(0, 16)}`,
  };
};

/** The S3 endpoint URL of an object, which the SigV4 `curl` in the `user-submissions` skill fetches. */
export const objectUrl = (r2: Pick<Config['r2'], 'accountId' | 'bucket'>, key: string): string =>
  `https://${r2.accountId}.r2.cloudflarestorage.com/${r2.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;

/**
 * Headers for one SigV4-signed S3 `PUT`. R2's region is always `auto`; the payload is hashed in full
 * because R2 rejects `UNSIGNED-PAYLOAD` for a request signed with an API-token-derived key.
 */
export const signPut = (options: {
  readonly r2: Config['r2'];
  readonly key: string;
  readonly body: Uint8Array<ArrayBuffer>;
  readonly contentType: string;
  readonly contentEncoding?: string;
  readonly now?: Date;
}): { readonly url: string; readonly headers: Record<string, string> } => {
  const { r2, key, body, contentType, contentEncoding, now = new Date() } = options;
  const host = `${r2.accountId}.r2.cloudflarestorage.com`;
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body);
  const headers: Record<string, string> = {
    'content-type': contentType,
    ...(contentEncoding ? { 'content-encoding': contentEncoding } : {}),
    'host': host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  const signed = Object.keys(headers).sort();
  const url = objectUrl(r2, key);
  const canonical = [
    'PUT',
    new URL(url).pathname,
    '',
    signed.map((name) => `${name}:${headers[name].trim()}\n`).join(''),
    signed.join(';'),
    payloadHash,
  ].join('\n');
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const signingKey = [dateStamp, 'auto', 's3', 'aws4_request'].reduce<Buffer | string>(
    (key, part) => createHmac('sha256', key).update(part).digest(),
    `AWS4${r2.secretAccessKey}`,
  );
  const signature = createHmac('sha256', signingKey).update(toSign).digest('hex');
  return {
    url,
    headers: {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${r2.accessKeyId}/${scope}, SignedHeaders=${signed.join(';')}, Signature=${signature}`,
    },
  };
};

export type Upload = {
  readonly key: string;
  readonly body: Uint8Array<ArrayBuffer>;
  readonly contentType: string;
  readonly contentEncoding?: string;
};

export interface Api {
  /** Stores an object in the trajectory bucket and returns where it landed. */
  readonly upload: (upload: Upload) => Effect.Effect<{ readonly bucket: string; readonly url: string }, TelemetryError>;
  /** Sends one PostHog event. */
  readonly capture: (event: string, properties: Record<string, unknown>) => Effect.Effect<void, TelemetryError>;
}

export class Telemetry extends Context.Service<Telemetry, Api>()('code-index/Telemetry') {}

const send = (what: string, request: () => Promise<Response>) =>
  Effect.tryPromise({
    try: async () => {
      const response = await request();
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${(await response.text()).slice(0, 500)}`);
      }
    },
    catch: (cause) => new TelemetryError({ message: `Cannot ${what}: ${String(cause)}`, cause }),
  });

/** Reports over HTTPS with the given credentials. */
export const layer = (config: Config): Layer.Layer<Telemetry> =>
  Layer.succeed(Telemetry, {
    upload: ({ key, body, contentType, contentEncoding }) => {
      const signed = signPut({ r2: config.r2, key, body, contentType, contentEncoding });
      return send(`upload ${key}`, () => fetch(signed.url, { method: 'PUT', headers: signed.headers, body })).pipe(
        Effect.as({ bucket: config.r2.bucket, url: signed.url }),
      );
    },
    capture: (event, properties) =>
      send(`capture ${event}`, () =>
        fetch(`${config.posthog.host}/i/v0/e/`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            api_key: config.posthog.apiKey,
            event,
            distinct_id: config.distinctId,
            timestamp: new Date().toISOString(),
            // A developer tool's events are not a person's activity; no person profile is made for them.
            properties: { ...properties, $process_person_profile: false },
          }),
        }),
      ),
  });

/** Keeps every upload and event in memory, for tests. */
export const recording = () => {
  const uploads: Upload[] = [];
  const events: { readonly event: string; readonly properties: Record<string, unknown> }[] = [];
  const layer = Layer.succeed(Telemetry, {
    upload: (upload) =>
      Effect.sync(() => {
        uploads.push(upload);
        return { bucket: 'test-bucket', url: `https://r2.test/test-bucket/${upload.key}` };
      }),
    capture: (event, properties) => Effect.sync(() => void events.push({ event, properties })),
  });
  return { layer, uploads, events };
};
