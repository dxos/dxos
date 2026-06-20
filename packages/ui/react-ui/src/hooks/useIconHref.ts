//
// Copyright 2025 DXOS.org
//

import { useCallback, useSyncExternalStore } from 'react';

import { useIconRegistry } from '../primitives/ThemeProvider/IconRegistry';

/**
 * Resolves an icon name to a same-document `<use href>`.
 *
 * Returns `undefined` while the icon is not yet present in the in-DOM sprite — kicking off
 * a runtime fetch as a side effect. Once the registry has the symbol (either because the
 * static sprite finished ingesting or because the resolver injected it), the component
 * re-renders via `useSyncExternalStore` and we return `#name`.
 */
export const useIconHref = (icon?: string) => {
  const registry = useIconRegistry();

  const subscribe = useCallback((listener: () => void) => registry.subscribe(listener), [registry]);
  const getSnapshot = useCallback(() => (icon ? registry.hasIcon(icon) : false), [icon, registry]);
  const getServerSnapshot = useCallback(() => false, []);

  const hasIcon = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!icon) {
    return undefined;
  }
  if (!hasIcon) {
    registry.requestIcon(icon);
    return undefined;
  }
  return `#${icon}`;
};
