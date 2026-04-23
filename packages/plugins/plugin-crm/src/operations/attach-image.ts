//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Entity, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { Organization, Person } from '@dxos/types';

import { AttachImage } from './definitions';

/**
 * Default image service base URL. Overridable per-invocation via the
 * `imageServiceUrl` input, or in the runtime environment via the
 * `DX_CRM_IMAGE_SERVICE_URL` environment variable. A per-space
 * `CrmSettings` object is planned (see PLUGIN.mdl feature F-8).
 */
const DEFAULT_IMAGE_SERVICE_URL = 'https://images.dxos.org';

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']);

/** Hard cap on bytes downloaded from the external image URL. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MiB

/** Timeout for the external image download. */
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Hosts that must be rejected to prevent SSRF attacks on internal metadata
 * services or development loopback addresses. Also rejects explicit private
 * IPv4 ranges in case the agent supplies a raw-IP URL.
 */
const isBlockedHost = (host: string): boolean => {
  const h = host.toLowerCase();
  if (h === 'localhost' || h === '0.0.0.0' || h === '::1' || h === '[::1]') {
    return true;
  }
  const ipv4 = h.replace(/^\[/, '').replace(/\]$/, '').split('.').map(Number);
  if (ipv4.length === 4 && ipv4.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    const [a, b] = ipv4;
    // 10.0.0.0/8
    if (a === 10) return true;
    // 127.0.0.0/8
    if (a === 127) return true;
    // 169.254.0.0/16 (link-local, includes cloud metadata service at 169.254.169.254).
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 254) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
};

const inferContentTypeFromUrl = (url: string): string | undefined => {
  const ext = url.split('?')[0]?.split('#')[0]?.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    default:
      return undefined;
  }
};

const filenameFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    const segment = parsed.pathname.split('/').pop();
    if (segment && segment.length > 0) {
      return segment.includes('.') ? segment : `${segment}.jpg`;
    }
  } catch {
    // Fall through.
  }
  return 'image.jpg';
};

const getImageServiceUrl = (override?: string): string => {
  if (override && override.length > 0) {
    return override;
  }
  const fromEnv = typeof process !== 'undefined' && process.env ? process.env.DX_CRM_IMAGE_SERVICE_URL : undefined;
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_IMAGE_SERVICE_URL;
};

/**
 * Validate that a URL is an absolute https URL whose host is not loopback,
 * private, or a cloud-metadata address.
 */
const validateExternalUrl = (raw: string): URL => {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`Only https URLs are accepted (got ${parsed.protocol})`);
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new Error(`Refusing to fetch from disallowed host: ${parsed.hostname}`);
  }
  return parsed;
};

/** Validate that an image-service-returned URL is absolute http(s). */
const isAbsoluteHttpUrl = (raw: string): boolean => {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const handler: Operation.WithHandler<typeof AttachImage> = AttachImage.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ subject, url, imageServiceUrl }) {
      const serviceUrl = getImageServiceUrl(imageServiceUrl);

      const validatedSource = yield* Effect.try({
        try: () => validateExternalUrl(url),
        catch: (cause) => new Error(`Rejected source URL: ${String(cause)}`),
      });

      const downloaded = yield* Effect.tryPromise({
        try: () => fetch(validatedSource.toString(), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }),
        catch: (cause) => new Error(`Failed to download image: ${String(cause)}`),
      });
      if (!downloaded.ok) {
        return yield* Effect.fail(new Error(`Failed to download image: ${downloaded.status} ${downloaded.statusText}`));
      }

      const contentLengthHeader = downloaded.headers.get('content-length');
      if (contentLengthHeader) {
        const contentLength = Number(contentLengthHeader);
        if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
          return yield* Effect.fail(new Error(`Image exceeds size cap (${contentLength} bytes > ${MAX_IMAGE_BYTES})`));
        }
      }

      const sourceBlob = yield* Effect.promise(() => downloaded.blob());
      if (sourceBlob.size > MAX_IMAGE_BYTES) {
        return yield* Effect.fail(new Error(`Image exceeds size cap (${sourceBlob.size} bytes > ${MAX_IMAGE_BYTES})`));
      }

      const responseType = downloaded.headers.get('content-type')?.split(';')[0]?.trim();
      // Strict: if the server supplied a content-type we require it to be
      // in the allowlist. No fallthrough to the URL extension — that was
      // exploitable by a .png URL that actually serves HTML.
      let contentType: string | undefined;
      if (responseType) {
        if (!ALLOWED_CONTENT_TYPES.has(responseType)) {
          return yield* Effect.fail(new Error(`Unsupported image content-type: ${responseType}`));
        }
        contentType = responseType;
      } else {
        contentType = inferContentTypeFromUrl(validatedSource.toString());
      }
      if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
        return yield* Effect.fail(new Error('Unable to determine image content-type'));
      }

      const blob = sourceBlob.type === contentType ? sourceBlob : new Blob([sourceBlob], { type: contentType });

      const formData = new FormData();
      formData.append('file', blob, filenameFromUrl(validatedSource.toString()));

      const uploadRes = yield* Effect.tryPromise({
        try: () =>
          fetch(new URL('/thumbnail', serviceUrl).toString(), {
            method: 'POST',
            body: formData,
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          }),
        catch: (cause) => new Error(`Image service upload failed: ${String(cause)}`),
      });
      if (!uploadRes.ok) {
        return yield* Effect.fail(
          new Error(`Image service rejected the upload: ${uploadRes.status} ${uploadRes.statusText}`),
        );
      }

      const { url: uploadedUrl } = (yield* Effect.promise(() => uploadRes.json())) as { url?: string };
      if (!uploadedUrl || uploadedUrl.length === 0 || !isAbsoluteHttpUrl(uploadedUrl)) {
        return yield* Effect.fail(new Error('Image service returned an invalid or non-absolute URL'));
      }

      const target = yield* Database.load(subject);
      if (!Obj.instanceOf(Person.Person, target) && !Obj.instanceOf(Organization.Organization, target)) {
        return yield* Effect.fail(
          new Error('Subject must be a Person or Organization (image field is only defined on those types)'),
        );
      }
      Entity.change(target as Entity.Any, (obj) => {
        (obj as { image?: string }).image = uploadedUrl;
      });

      log.info('attach-image', { uploadedUrl });

      return { imageUrl: uploadedUrl };
    }),
  ),
);

export default handler;
