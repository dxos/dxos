//
// Copyright 2025 DXOS.org
//

import { useLayoutEffect } from 'react';

/**
 * Forces the document into dark mode for the lifetime of the calling component, reverting the
 * document element to its prior state on unmount.
 *
 * The welcome screen must always render dark. DXOS theme tokens are declared on `:root` using CSS
 * `light-dark()`, which resolves against the `color-scheme` of the element where they are declared,
 * so a nested `.dark` class (or theme provider) cannot re-resolve them — there is no per-subtree
 * theming. The only lever is `.dark` on the document element, which is also how the framework's own
 * dark-mode plugin toggles the theme. The welcome dialog is additionally portaled to `<body>`, so
 * there is no React ancestor to theme in its place.
 */
export const useForceDarkTheme = () => {
  useLayoutEffect(() => {
    const root = document.documentElement;
    let restoreDark = root.classList.contains('dark');
    root.classList.add('dark');

    // The theme plugin and the boot script rewrite the class when the system preference or the
    // appearance setting changes; re-assert it before paint, and restore the latest light request.
    const observer = new MutationObserver(() => {
      if (!root.classList.contains('dark')) {
        restoreDark = false;
        root.classList.add('dark');
      }
    });
    observer.observe(root, { attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      root.classList.toggle('dark', restoreDark);
    };
  }, []);
};
