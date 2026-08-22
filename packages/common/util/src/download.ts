//
// Copyright 2026 DXOS.org
//

import { isTauri } from './platform';

/**
 * How long the object URL is kept alive after the click; WebKit resolves the blob asynchronously,
 * so revoking it in the same task aborts the download.
 */
const OBJECT_URL_TTL = 30_000;

/**
 * Trigger a browser download of an already-addressable URL.
 * The anchor is attached to the document because Firefox ignores `click()` on a detached element.
 */
export const downloadUrl = (url: string, filename: string): void => {
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

/**
 * Save through Tauri's native dialog. Resolves false if the user dismissed it.
 */
const saveBlobNative = async (data: Blob, filename: string): Promise<boolean> => {
  const [{ save }, { writeFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ]);

  const path = await save({ defaultPath: filename });
  if (!path) {
    return false;
  }

  await writeFile(path, new Uint8Array(await data.arrayBuffer()));
  return true;
};

/**
 * Save a blob to disk, resolving false if the user cancelled.
 *
 * The Tauri webview registers no download handler, so `<a download>` is silently dropped there —
 * every download must go through the native save dialog instead.
 */
export const downloadBlob = async (data: Blob, filename: string): Promise<boolean> => {
  if (isTauri()) {
    return saveBlobNative(data, filename);
  }

  const url = URL.createObjectURL(data);
  try {
    downloadUrl(url, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_TTL);
  }

  return true;
};
