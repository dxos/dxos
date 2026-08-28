//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Entity, Obj } from '@dxos/echo';
import { proxyFetchLegacy } from '@dxos/edge-client/cors-proxy';
import { EdgeServiceClient, Image } from '@dxos/edge-client/service';
import { BaseError } from '@dxos/errors';
import { log } from '@dxos/log';
import { Organization, Person } from '@dxos/types';
import { safeFetchBytes, validateExternalUrl } from '@dxos/util';

import { CrmOperation } from '#types';

/** Tagged failure channel for the attach-image path (validation, download, re-host). */
export class AttachImageError extends BaseError.extend('AttachImageError', 'Failed to attach image') {}

// SVG is intentionally excluded: inline <script>/event handlers make it a
// stored-XSS risk for any downstream surface that renders the image via
// <object>, <iframe>, or same-origin fetch rather than <img src>.
const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** Hard cap on bytes downloaded from the external image URL. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MiB

/** Timeout for the external image download. */
const FETCH_TIMEOUT_MS = 15_000;

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

// No built-in endpoint: the `imageServiceUrl` input carries it, resolved from
// `runtime.services.edgeServices: image` by the contributing capability, since an operation handler
// has no config of its own. `DX_CRM_IMAGE_SERVICE_URL` covers node callers (tests, CLI) only.
const getImageServiceUrl = (override?: string): string | undefined => {
  if (override && override.length > 0) {
    return override;
  }
  const fromEnv = typeof process !== 'undefined' && process.env ? process.env.DX_CRM_IMAGE_SERVICE_URL : undefined;
  return fromEnv && fromEnv.length > 0 ? fromEnv : undefined;
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

/**
 * The hardened attach path shared by `AttachImage` and `EnrichImages`: validate the external URL,
 * download it (SSRF-guarded, size- and content-type-capped), re-host through the image service, and
 * write the canonical URL onto the already-loaded subject's `image` field. Fails with `Error` on
 * any rejection (invalid URL, blocked host, oversize, wrong type, upload failure).
 */
export const attachImageToSubject = ({
  subject,
  url,
  imageServiceUrl,
}: {
  subject: Person.Person | Organization.Organization;
  url: string;
  imageServiceUrl?: string;
}): Effect.Effect<string, AttachImageError> =>
  Effect.gen(function* () {
    const serviceUrl = getImageServiceUrl(imageServiceUrl);
    if (!serviceUrl) {
      return yield* Effect.fail(
        new AttachImageError({
          message: 'Image service endpoint is not configured (imageServiceUrl input or DX_CRM_IMAGE_SERVICE_URL).',
        }),
      );
    }

    const validatedSource = yield* Effect.try({
      try: () => validateExternalUrl(url),
      catch: AttachImageError.wrap({ message: 'Rejected source URL' }),
    });

    const downloaded = yield* Effect.tryPromise({
      try: () =>
        // Proxied because this runs in the page and the source is a third-party origin. Headless
        // callers of `safeFetchBytes` omit `fetch` and go direct.
        safeFetchBytes(validatedSource, {
          maxBytes: MAX_IMAGE_BYTES,
          timeoutMs: FETCH_TIMEOUT_MS,
          fetch: (target, init) => proxyFetchLegacy(target, init),
        }),
      catch: AttachImageError.wrap({ message: 'Failed to download image' }),
    });
    const responseType = downloaded.contentType?.toLowerCase();
    // Strict: if the server supplied a content-type we require it to be
    // in the allowlist. No fallthrough to the URL extension — that was
    // exploitable by a .png URL that actually serves HTML.
    let contentType: string | undefined;
    if (responseType) {
      if (!ALLOWED_CONTENT_TYPES.has(responseType)) {
        return yield* Effect.fail(new AttachImageError({ message: `Unsupported image content-type: ${responseType}` }));
      }
      contentType = responseType;
    } else {
      contentType = inferContentTypeFromUrl(validatedSource.toString());
    }
    if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
      return yield* Effect.fail(new AttachImageError({ message: 'Unable to determine image content-type' }));
    }

    const blob = new Blob([downloaded.bytes as BlobPart], { type: contentType });

    const client = new EdgeServiceClient({ baseUrl: serviceUrl, timeout: FETCH_TIMEOUT_MS });
    const { url: uploadedUrl } = yield* Image.thumbnail(client, blob, {
      filename: filenameFromUrl(validatedSource.toString()),
    }).pipe(Effect.mapError(AttachImageError.wrap({ message: 'Image service upload failed' })));
    if (!isAbsoluteHttpUrl(uploadedUrl)) {
      return yield* Effect.fail(
        new AttachImageError({ message: 'Image service returned an invalid or non-absolute URL' }),
      );
    }

    Entity.update(subject as Entity.Any, (obj) => {
      (obj as { image?: string }).image = uploadedUrl;
    });

    log.info('attach-image', { uploadedUrl });
    return uploadedUrl;
  });

export default CrmOperation.AttachImage.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ subject, url, imageServiceUrl }) {
      const target = yield* Database.load(subject);
      if (!Obj.instanceOf(Person.Person, target) && !Obj.instanceOf(Organization.Organization, target)) {
        return yield* Effect.fail(
          new AttachImageError({
            message: 'Subject must be a Person or Organization (image field is only defined on those types)',
          }),
        );
      }
      const imageUrl = yield* attachImageToSubject({ subject: target, url, imageServiceUrl });
      return { imageUrl };
    }),
  ),
  Operation.opaqueHandler,
);
