//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/** The bundle's main module: the generated `PluginHost` entry. */
export const MAIN_MODULE = 'index.js';

/** The runtime a release is loaded with; matches what compute-service loads Worker Loader functions with. */
export const COMPATIBILITY_DATE = '2026-03-17';

/**
 * `no_handle_cross_request_promise_resolution` matches every EDGE worker: past the 2024-10-14 default a promise settled
 * from another request's context has its continuation dropped.
 */
export const COMPATIBILITY_FLAGS: readonly string[] = [
  'nodejs_compat',
  'nodejs_als',
  'no_handle_cross_request_promise_resolution',
];

/** A release's files by path, as the bundler emits them. */
export type Files = Readonly<Record<string, Uint8Array>>;

/** What a loader needs besides the files, readable without loading any code. */
export type Manifest = {
  readonly mainModule: string;
  readonly files: readonly string[];
  readonly compatibilityDate: string;
  readonly compatibilityFlags: readonly string[];
  /** Content hash of the files; the release's Worker Loader id, so a changed release never reuses an old isolate. */
  readonly hash: string;
};

export type LoaderModule = string | { readonly wasm: ArrayBuffer };

/** Whether a file is loaded as a module: source maps are kept beside a release, never loaded. */
const isModule = (path: string): boolean => /\.(js|mjs|wasm)$/.test(path);

/** The modules a Worker Loader `WorkerCode` takes. */
export const toLoaderModules = (files: Files): Record<string, LoaderModule> => {
  const decoder = new TextDecoder();
  return Object.fromEntries(
    Object.entries(files)
      .filter(([path]) => isModule(path))
      .map(([path, content]): [string, LoaderModule] => [
        path,
        path.endsWith('.wasm') ? { wasm: toArrayBuffer(content) } : decoder.decode(content),
      ]),
  );
};

/** SHA-256 over every file's path and content, in path order, as hex. */
export const hash = async (files: Files): Promise<string> => {
  const encoder = new TextEncoder();
  const parts = Object.keys(files)
    .sort()
    .flatMap((path) => [encoder.encode(`${path}\0${files[path].byteLength}\0`), files[path]]);
  const buffer = new Uint8Array(parts.reduce((length, part) => length + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    buffer.set(part, offset);
    offset += part.byteLength;
  }
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const makeManifest = async (files: Files): Promise<Manifest> => ({
  mainModule: MAIN_MODULE,
  files: Object.keys(files).sort(),
  compatibilityDate: COMPATIBILITY_DATE,
  compatibilityFlags: COMPATIBILITY_FLAGS,
  hash: await hash(files),
});

const toArrayBuffer = (content: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(content.byteLength);
  new Uint8Array(buffer).set(content);
  return buffer;
};
