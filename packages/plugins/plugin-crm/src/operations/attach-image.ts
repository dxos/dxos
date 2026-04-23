//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Entity } from '@dxos/echo';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';

import { AttachImage } from './definitions';

/**
 * Default image service base URL. Overridable per-invocation via the
 * `imageServiceUrl` input, or in the runtime environment via the
 * `DX_CRM_IMAGE_SERVICE_URL` environment variable. A per-space
 * `CrmSettings` object is planned (see PLUGIN.mdl feature F-8).
 */
const DEFAULT_IMAGE_SERVICE_URL = 'https://images.dxos.org';

const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

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
  const fromEnv =
    typeof process !== 'undefined' && process.env ? process.env.DX_CRM_IMAGE_SERVICE_URL : undefined;
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_IMAGE_SERVICE_URL;
};

const handler: Operation.WithHandler<typeof AttachImage> = AttachImage.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ subject, url, imageServiceUrl }) {
      const serviceUrl = getImageServiceUrl(imageServiceUrl);

      const downloaded = yield* Effect.tryPromise({
        try: () => fetch(url),
        catch: (cause) => new Error(`Failed to download image: ${String(cause)}`),
      });
      if (!downloaded.ok) {
        return yield* Effect.fail(
          new Error(`Failed to download image: ${downloaded.status} ${downloaded.statusText}`),
        );
      }

      const sourceBlob = yield* Effect.promise(() => downloaded.blob());
      const responseType = downloaded.headers.get('content-type')?.split(';')[0]?.trim();
      const inferredType = inferContentTypeFromUrl(url);
      const contentType =
        responseType && ALLOWED_CONTENT_TYPES.has(responseType) ? responseType : inferredType;
      if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
        return yield* Effect.fail(new Error(`Unsupported image content-type: ${String(responseType)}`));
      }

      const blob =
        sourceBlob.type === contentType ? sourceBlob : new Blob([sourceBlob], { type: contentType });

      const formData = new FormData();
      formData.append('file', blob, filenameFromUrl(url));

      const uploadRes = yield* Effect.tryPromise({
        try: () =>
          fetch(new URL('/thumbnail', serviceUrl).toString(), {
            method: 'POST',
            body: formData,
          }),
        catch: (cause) => new Error(`Image service upload failed: ${String(cause)}`),
      });
      if (!uploadRes.ok) {
        return yield* Effect.fail(
          new Error(`Image service rejected the upload: ${uploadRes.status} ${uploadRes.statusText}`),
        );
      }

      const { url: uploadedUrl } = (yield* Effect.promise(() => uploadRes.json())) as { url?: string };
      if (!uploadedUrl || uploadedUrl.length === 0) {
        return yield* Effect.fail(new Error('Image service returned an empty URL'));
      }

      const target = yield* Database.load(subject);
      Entity.change(target as Entity.Any, (obj) => {
        (obj as { image?: string }).image = uploadedUrl;
      });

      log.info('attach-image', { uploadedUrl });

      return { imageUrl: uploadedUrl };
    }),
  ),
);

export default handler;
