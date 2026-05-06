//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Entity, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Organization, Person } from '@dxos/types';

import { AttachImage } from './definitions';

/**
 * Default image service base URL. Overridable per-invocation via the
 * `imageServiceUrl` input, or in the runtime environment via the
 * `DX_CRM_IMAGE_SERVICE_URL` environment variable. A per-space
 * `CrmSettings` object is planned (see PLUGIN.mdl feature F-8).
 */
const DEFAULT_IMAGE_SERVICE_URL = 'https://images.dxos.org';

// SVG is intentionally excluded: inline <script>/event handlers make it a
// stored-XSS risk for any downstream surface that renders the image via
// <object>, <iframe>, or same-origin fetch rather than <img src>.
const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** Hard cap on bytes downloaded from the external image URL. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MiB

/** Timeout for the external image download. */
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Hosts that must be rejected to prevent SSRF attacks on internal metadata
 * services or development loopback addresses. Also rejects explicit private
 * IPv4 ranges in case the agent supplies a raw-IP URL, plus a best-effort
 * check on IPv6 loopback / unique-local / link-local literals.
 */
const isBlockedHost = (host: string): boolean => {
  const h = host.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  if (h === 'localhost' || h === '0.0.0.0' || h === '::' || h === '::1') {
    return true;
  }

  // IPv6 literals: reject loopback (::1), link-local (fe80::/10), and
  // unique-local (fc00::/7) prefixes. The parser is intentionally loose —
  // any false positive is better than a false negative for SSRF.
  if (h.includes(':')) {
    if (h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) {
      return true;
    }
    if (h.startsWith('fc') || h.startsWith('fd')) {
      return true;
    }
    // IPv4-mapped IPv6 (::ffff:a.b.c.d) — fall through to the IPv4 parser
    // on the embedded dotted-quad.
    const mapped = h.match(/::ffff:([\d.]+)$/);
    if (!mapped) {
      return false;
    }
    return isBlockedIPv4(mapped[1]);
  }

  return isBlockedIPv4(h);
};

const isBlockedIPv4 = (host: string): boolean => {
  const ipv4 = host.split('.').map(Number);
  if (ipv4.length !== 4 || !ipv4.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    return false;
  }
  const [a, b] = ipv4;
  // 10.0.0.0/8
  if (a === 10) {
    return true;
  }
  // 127.0.0.0/8
  if (a === 127) {
    return true;
  }
  // 169.254.0.0/16 (link-local; includes cloud metadata at 169.254.169.254).
  if (a === 169 && b === 254) {
    return true;
  }
  // 172.16.0.0/12
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) {
    return true;
  }
  // 192.168.0.0/16
  if (a === 192 && b === 168) {
    return true;
  }
  // 100.64.0.0/10 (carrier-grade NAT).
  if (a === 100 && b !== undefined && b >= 64 && b <= 127) {
    return true;
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
    // SVG intentionally rejected; see ALLOWED_CONTENT_TYPES.
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

      // Stream the body and enforce the size cap as we go — a server that
      // omits content-length or lies about it can otherwise feed arbitrary
      // bytes bounded only by the fetch timeout.
      const sourceBlob = yield* Effect.tryPromise({
        try: async () => {
          const body = downloaded.body;
          if (!body) {
            // No stream available (should be rare); fall back to .blob() but
            // re-check size below.
            const fallback = await downloaded.blob();
            if (fallback.size > MAX_IMAGE_BYTES) {
              throw new Error(`Image exceeds size cap (${fallback.size} bytes > ${MAX_IMAGE_BYTES})`);
            }
            return fallback;
          }
          const reader = body.getReader();
          const chunks: Uint8Array[] = [];
          let total = 0;
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) {
                break;
              }
              total += value.byteLength;
              if (total > MAX_IMAGE_BYTES) {
                await reader.cancel();
                throw new Error(`Image exceeds size cap (>${MAX_IMAGE_BYTES} bytes)`);
              }
              chunks.push(value);
            }
          } finally {
            reader.releaseLock?.();
          }
          return new Blob(chunks as BlobPart[]);
        },
        catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
      });

      const responseType = downloaded.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
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
      Entity.update(target as Entity.Any, (obj) => {
        (obj as { image?: string }).image = uploadedUrl;
      });

      log.info('attach-image', { uploadedUrl });

      return { imageUrl: uploadedUrl };
    }),
  ),
);

export default handler;
