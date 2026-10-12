//
// Copyright 2026 DXOS.org
//

import { type PluginOption } from 'vite';

const PRELOAD_HELPER_ID = '\0vite/preload-helper.js';
const SEEN_DECLARATION = 'const seen = {};';

/** Vite's per-dependency scan over every `<link>` in the document (`preload` in vite/dist/node). */
const LINK_SCAN =
  /for \(let i = links\.length - 1; i >= 0; i--\) \{\s*const link = links\[i\];\s*if \(link\.href === dep && \(!isCss \|\| link\.rel === "stylesheet"\)\) return;\s*\}/;

/**
 * Index the document's `<link>` elements once instead of rescanning them for every preloaded URL.
 *
 * Vite's preload helper already remembers every URL it handles (`seen`), but for each new one it walks
 * all `<link>` elements reading `link.href`, which resolves a URL per read. With ~1,200 chunks that is
 * ~700k reads and ~300ms of main thread at boot. Links the helper inserts itself are covered by `seen`,
 * so only the links present before its first call need checking, and a `Set` built on that call does it.
 * Fails the build if the helper changes shape, rather than silently dropping the optimization.
 */
export const preloadLinkIndex = (): PluginOption => ({
  name: 'dxos-preload-link-index',
  apply: 'build',
  enforce: 'post',
  transform: {
    filter: { id: new RegExp(`^${PRELOAD_HELPER_ID.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) },
    handler(code) {
      if (!LINK_SCAN.test(code)) {
        this.error('vite preload helper changed: the `<link>` scan this plugin replaces was not found.');
      }
      const indexed = code.replace(
        LINK_SCAN,
        [
          'if (!documentLinks) {',
          '  documentLinks = { css: new Set(), any: new Set() };',
          '  for (const link of links) {',
          '    documentLinks.any.add(link.href);',
          '    if (link.rel === "stylesheet") documentLinks.css.add(link.href);',
          '  }',
          '}',
          'if ((isCss ? documentLinks.css : documentLinks.any).has(dep)) return;',
        ].join('\n'),
      );
      if (!indexed.includes(SEEN_DECLARATION)) {
        this.error('vite preload helper changed: the `seen` declaration this plugin extends was not found.');
      }
      return indexed.replace(SEEN_DECLARATION, `${SEEN_DECLARATION} let documentLinks;`);
    },
  },
});
