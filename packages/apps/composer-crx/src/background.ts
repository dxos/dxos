//
// Copyright 2024 DXOS.org
//

import { onMessage } from 'webext-bridge/background';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { IMAGE_SERVICE_URL, THUMBNAIL_PROP } from './defs';

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
 * Background worker.
 */
const main = async () => {
  onMessage('config', ({ data }) => {
    return { debug: data.debug ?? false };
  });

  // Create the context menu item.
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: 'image-action',
      title: 'Create Thumbnail…',
      contexts: ['image'],
    });
  });

  // Handle right-click action.
  browser.contextMenus.onClicked.addListener(async (info: any, tab: any) => {
    if (info.menuItemId === 'image-action') {
      const imageUrl = info.srcUrl;

      // Fetch the image as a Blob.
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

        log.info('fetched blob:', { url: imageUrl, type: blob.type });

        // Post blob to image service with form data.
        const formData = new FormData();
        const filename = getFilenameFromUrl(imageUrl);
        const field = 'file'; // TODO(burdon): Protocol def.
        formData.append(field, blob, filename);
        // NOTE: Don't set Content-Type header - let browser set multipart/form-data with boundary.
        const uploadRes = await fetch(IMAGE_SERVICE_URL, {
          method: 'POST',
          body: formData,
        });

        // Store result URL and open extension popup.
        try {
          // Store the result URL in storage so popup can access it.
          const result = await uploadRes.json();
          const resultUrl = result.url || '';
          if (resultUrl) {
            await browser.storage.local.set({ [THUMBNAIL_PROP]: resultUrl });
          }

          // Open extension popup (only works in response to user action like context menu).
          try {
            await browser.action.openPopup();
          } catch {
            // If openPopup fails (e.g., popup already open), set badge to indicate result.
            await browser.action.setBadgeText({ text: '✓' });
            await browser.action.setBadgeBackgroundColor({ color: '#ff5500' });
            // Clear badge after 3 seconds.
            setTimeout(() => {
              void browser.action.setBadgeText({ text: '' });
            }, 3_000);
          }
        } catch (err) {
          log.error('Failed to open popup', { err });
        }
      } catch (err) {
        log.catch(err);
      }
    }
  });
};

void main();
