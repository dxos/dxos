//
// Copyright 2025 DXOS.org
//

import { useIconRegistry } from '../components/ThemeProvider/IconRegistry';

/**
 * Resolves an icon name to a same-document `<use href>`, triggering the runtime resolver
 * to fetch and inject the symbol on demand if it isn't already in the in-DOM sprite.
 */
export const useIconHref = (icon?: string) => {
  const registry = useIconRegistry();
  if (!icon) {
    return undefined;
  }
  if (!registry.hasIcon(icon)) {
    registry.requestIcon(icon);
  }
  return `#${icon}`;
};
