//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

const MAX_DIMENSION = 512;
const JPEG_QUALITY = 0.8;
const FETCH_TIMEOUT_MS = 5_000;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * Encode a blob as a data URL. `FileReader` is unavailable in service
 * workers, so the bytes are base64-encoded manually (chunked to keep
 * `String.fromCharCode` off the stack limit).
 */
export const blobToDataUrl = async (blob: Blob): Promise<string> => {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < buffer.length; offset += chunkSize) {
    binary += String.fromCharCode(...buffer.subarray(offset, offset + chunkSize));
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
};

/**
 * Fetch and downscale an image to a JPEG thumbnail data URL. Returns
 * `undefined` on any failure — the thumbnail is best-effort and must never
 * fail the action.
 */
export const captureThumbnail = async (url: string): Promise<string | undefined> => {
  try {
    // The URL is page-controlled (og:image), so gate it before fetching:
    // public http(s) only, never loopback — a malicious page must not be able
    // to direct extension-origin requests at local services.
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }
    const { hostname } = parsed;
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.startsWith('127.') || hostname === '[::1]') {
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(parsed.toString(), { signal: controller.signal });
    } finally {
      // The timer holds the service worker alive and would fire a stray abort
      // if fetch rejects first; always clear it.
      clearTimeout(timer);
    }
    if (!response.ok) {
      return undefined;
    }
    const blob = await response.blob();
    if (blob.size > MAX_SOURCE_BYTES || !blob.type.startsWith('image/')) {
      return undefined;
    }
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) {
      return undefined;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const thumbnail = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
    return await blobToDataUrl(thumbnail);
  } catch (err) {
    log.info('thumbnail capture failed', { error: err instanceof Error ? err.message : String(err) });
    return undefined;
  }
};

/**
 * Attach a thumbnail to extracted snapshot inputs when they carry an og-image
 * hint and no thumbnail yet. Pass-through for anything else.
 */
export const enrichSnapshotWithThumbnail = async (inputs: unknown): Promise<unknown> => {
  if (!isRecord(inputs) || typeof inputs.imageData === 'string') {
    return inputs;
  }
  const hints = inputs.hints;
  if (!isRecord(hints) || typeof hints.ogImage !== 'string') {
    return inputs;
  }
  const imageData = await captureThumbnail(hints.ogImage);
  return imageData ? { ...inputs, imageData } : inputs;
};
