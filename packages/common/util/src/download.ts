//
// Copyright 2026 DXOS.org
//

import { isTauri } from './platform';

/** WebKit resolves the blob asynchronously, so revoking in the same task aborts the download. */
const OBJECT_URL_TTL = 30_000;

/**
 * Trigger a browser download of an addressable URL. Not exported: the Tauri webview drops the click,
 * and an anchor gives the caller no way to notice it did nothing.
 */
const downloadUrl = (url: string, filename: string): void => {
  const element = document.createElement('a');
  element.href = url;
  element.download = filename;
  // A cross-origin URL that ignores `download` then opens in a named window rather than
  // navigating the app away.
  element.target = 'download';
  element.rel = 'noopener';
  element.style.display = 'none';
  document.body.appendChild(element);
  try {
    element.click();
  } finally {
    element.remove();
  }
};

/** Save through Tauri's native dialog, resolving false if the user dismissed it. */
const saveBlobNative = async (data: Blob, filename: string): Promise<boolean> => {
  const { save } = await import('@tauri-apps/plugin-dialog');
  const path = await save({ defaultPath: filename });
  if (!path) {
    return false;
  }

  const { writeFile } = await import('@tauri-apps/plugin-fs');
  await writeFile(path, new Uint8Array(await data.arrayBuffer()));
  return true;
};

/** Trigger an anchor download of a blob, keeping the object URL alive past the click. */
const downloadBlobAnchor = (data: Blob, filename: string): void => {
  const url = URL.createObjectURL(data);
  try {
    downloadUrl(url, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_TTL);
  }
};

/**
 * Save a blob to disk, resolving false if the user cancelled and rejecting if the save failed.
 *
 * The Tauri webview registers no download handler, so `<a download>` is dropped there and the
 * native dialog is the only path that writes anything — a platform without it (the iOS build, whose
 * capabilities omit `dialog`/`fs`) has to raise, since falling back to the anchor would report a
 * success that never happened.
 */
export const downloadBlob = async (data: Blob, filename: string): Promise<boolean> => {
  if (isTauri()) {
    return saveBlobNative(data, filename);
  }

  downloadBlobAnchor(data, filename);
  return true;
};
