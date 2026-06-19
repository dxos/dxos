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
    const hadDark = root.classList.contains('dark');
    root.classList.add('dark');
    return () => {
      // Revert to whatever the document element's state was before this component mounted.
      root.classList.toggle('dark', hadDark);
    };
  }, []);
};
