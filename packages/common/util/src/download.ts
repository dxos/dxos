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
 * Ask Tauri's native dialog where to save, resolving undefined where the dialog is unreachable —
 * a platform whose capability set omits `dialog`/`fs`, such as the iOS build, which rejects the
 * import or the command itself. Null is the user dismissing it.
 */
const promptSavePath = async (filename: string): Promise<string | null | undefined> => {
  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    return await save({ defaultPath: filename });
  } catch {
    return undefined;
  }
};

/**
 * Save through Tauri's native dialog. Resolves false if the user dismissed it, and undefined where
 * the dialog is unreachable, leaving the caller no worse off for attempting the anchor.
 */
const saveBlobNative = async (data: Blob, filename: string): Promise<boolean | undefined> => {
  const path = await promptSavePath(filename);
  if (path === undefined) {
    return undefined;
  }
  if (path === null) {
    return false;
  }

  // Past the dialog the plugins are known reachable, so a write failure is a real error to surface.
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
 * Save a blob to disk, resolving false if the user cancelled.
 *
 * The Tauri webview registers no download handler, so `<a download>` is silently dropped there —
 * every download must go through the native save dialog instead.
 */
export const downloadBlob = async (data: Blob, filename: string): Promise<boolean> => {
  if (isTauri()) {
    const saved = await saveBlobNative(data, filename);
    if (saved !== undefined) {
      return saved;
    }
  }

  downloadBlobAnchor(data, filename);
  return true;
};
