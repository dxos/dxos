//
// Copyright 2026 DXOS.org
//

/** The folder of the app's build output that holds the site's build (spec F-13.2). */
export const SITE_DIR = '/site';

/** A file such as a script, a stylesheet or the hero `.dx.svg`, as against a page address. */
export const isFile = (pathname: string) => /\.[^/]+$/.test(pathname);

/**
 * Whether a landing host serves this path from the site (spec F-13.3): the home page, the docs, the site's build
 * files and search index, and any file.
 */
export const isSitePath = (pathname: string) =>
  pathname === '/' || /^\/docs(\/|$)/.test(pathname) || /^\/(_astro|pagefind)\//.test(pathname) || isFile(pathname);
