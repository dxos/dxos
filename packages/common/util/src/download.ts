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

type NativeSave = 'saved' | 'cancelled' | 'unavailable';

/** Save through Tauri's native dialog. */
const saveBlobNative = async (data: Blob, filename: string): Promise<NativeSave> => {
  let path: string | null;
  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    path = await save({ defaultPath: filename });
  } catch {
    // A platform whose capability set omits `dialog`/`fs`, such as the iOS build, rejects the import
    // or the command itself; the caller is no worse off attempting the anchor.
    return 'unavailable';
  }

  if (!path) {
    return 'cancelled';
  }

  // Past the dialog the plugins are known reachable, so a write failure is a real error to surface.
  const { writeFile } = await import('@tauri-apps/plugin-fs');
  await writeFile(path, new Uint8Array(await data.arrayBuffer()));
  return 'saved';
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
 * Save a blob to disk, resolving false if the user cancelled.
 *
 * The Tauri webview registers no download handler, so `<a download>` is dropped there.
 */
export const downloadBlob = async (data: Blob, filename: string): Promise<boolean> => {
  if (isTauri()) {
    const outcome = await saveBlobNative(data, filename);
    if (outcome !== 'unavailable') {
      return outcome === 'saved';
    }
  }

  downloadBlobAnchor(data, filename);
  return true;
};
