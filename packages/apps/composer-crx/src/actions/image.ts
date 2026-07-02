//
// Copyright 2024 DXOS.org
//

import browser from 'webextension-polyfill';

import { EdgeServiceClient, Image } from '@dxos/edge-client/service';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';

import { THUMBNAIL_PROP, getConfig } from '../config';

/**
 * Get content type from URL extension.
 */
const getContentTypeFromUrl = (url: string): string | null => {
  const ext = url.split('.').pop()?.toLowerCase();
  const typeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
  };

  return ext ? (typeMap[ext] ?? null) : null;
};

/**
 * Get filename from URL.
 */
const getFilenameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() ?? 'image';
    return filename.includes('.') ? filename : `${filename}.jpg`;
  } catch {
    return 'image.jpg';
  }
};

/**
 * Use EDGE image-service to store and create thumbnail.
 */
export const createThumbnail = async (imageUrl: string) => {
  // The caller is a context-menu listener with no error handling, so the whole
  // flow (fetch, decode, upload, persist) is wrapped to surface any failure via
  // an error badge rather than an unhandled rejection.
  try {
    const res = await fetch(imageUrl);
    let blob = await res.blob();

    // Ensure blob has correct content-type.
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    const responseType = res.headers.get('content-type');
    const inferredType = getContentTypeFromUrl(imageUrl);
    const contentType =
      responseType && allowedTypes.includes(responseType.split(';')[0]?.trim())
        ? responseType.split(';')[0]?.trim()
        : inferredType;

    // Ensure blob has a valid content-type before posting.
    if (!contentType) {
      throw new Error('Unable to determine image content-type');
    }

    // Create blob with correct content-type if needed.
    if (!blob.type || blob.type !== contentType) {
      blob = new Blob([blob], { type: contentType });
    }

    // Post blob to the image service and store the hosted URL; the side panel
    // picks it up via `storage.onChanged`.
    const config = await getConfig();
    const client = new EdgeServiceClient({ baseUrl: config.imageServiceUrl });
    const { url: resultUrl } = await EffectEx.runPromise(
      Image.thumbnail(client, blob, { filename: getFilenameFromUrl(imageUrl) }),
    );
    if (resultUrl) {
      await browser.storage.local.set({ [THUMBNAIL_PROP]: resultUrl });
    }
  } catch (err) {
    log.error('thumbnail creation failed', { err });
    await browser.action.setBadgeText({ text: '!' });
    await browser.action.setBadgeBackgroundColor({ color: '#cc0000' });
    setTimeout(() => {
      void browser.action.setBadgeText({ text: '' });
    }, 3_000);
  }
};
