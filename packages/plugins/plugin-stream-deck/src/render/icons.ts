//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { getIconRegistry } from '@dxos/react-ui';

import { type IconMarkup } from './key';

const SPRITE_SELECTOR = '[data-dx-icon-sprite]';
const DEFAULT_VIEW_BOX = '0 0 256 256';

const readSymbol = (name: string): IconMarkup | undefined => {
  const symbol = document.querySelector(`${SPRITE_SELECTOR} #${CSS.escape(name)}`);
  return symbol ? { markup: symbol.innerHTML, viewBox: symbol.getAttribute('viewBox') ?? DEFAULT_VIEW_BOX } : undefined;
};

/**
 * Reads one icon's geometry out of the app's in-DOM sprite so it can be inlined into a key.
 *
 * The device renders our SVG outside the document, where a `<use href="#name">` reference cannot
 * resolve — hence inlining. This is the only DOM-dependent part of rendering; the renderers
 * themselves take the markup as an argument and stay pure.
 */
export const resolveIcon = (name: string): IconMarkup | undefined => {
  const registry = getIconRegistry();
  if (!registry.hasIcon(name)) {
    // Registers a runtime fetch; the caller re-renders when the registry notifies.
    registry.requestIcon(name);
    return undefined;
  }

  return readSymbol(name);
};

/**
 * Resolves several icons, re-rendering as the registry ingests the sprite or completes a runtime
 * fetch. Returns a map keyed by icon name; a name is absent until its symbol is available.
 */
export const useIcons = (names: readonly string[]): Record<string, IconMarkup> => {
  const registry = getIconRegistry();
  const revision = useSyncExternalStore(
    useCallback((listener: () => void) => registry.subscribe(listener), [registry]),
    () => names.filter((name) => registry.hasIcon(name)).join(','),
    () => '',
  );

  return useMemo(() => {
    const resolved: Record<string, IconMarkup> = {};
    for (const name of names) {
      const icon = resolveIcon(name);
      if (icon) {
        resolved[name] = icon;
      }
    }
    return resolved;
    // `revision` is the subscription's snapshot: it changes precisely when the resolvable set does.
  }, [revision]);
};
