//
// Copyright 2026 DXOS.org
//

import { type FC, createContext, useContext } from 'react';

/**
 * Props handed to the boundary renderer when a role dispatches across a
 * `<dx-surface-boundary>` boundary instead of in-tree.
 */
export type SurfaceBoundaryProps = {
  role: string;
  data?: Record<string, any>;
  limit?: number;
  [key: string]: any;
};

/**
 * The role currently being dispatched inside a `<dx-surface-boundary>`; the same role re-entering
 * the dispatcher inside its own boundary must render in-tree or it would recurse forever.
 */
export const BoundaryScopeContext = createContext<string | null>(null);

/**
 * The boundary role this render tree lives inside, or `null` in the primary app root.
 * `ReactContext` contributions that render chrome DOM (e.g. a toast viewport) must gate it
 * on this — re-composed per boundary root, unconditional chrome would duplicate per root.
 */
export const useSurfaceBoundaryScope = (): string | null => useContext(BoundaryScopeContext);

// Injected by `registerSurfaceBoundaryElement` to avoid a module cycle between the dispatcher
// and the element that renders the dispatcher.
let boundaryRenderer: FC<SurfaceBoundaryProps> | null = null;

export const setSurfaceBoundaryRenderer = (renderer: FC<SurfaceBoundaryProps> | null): void => {
  boundaryRenderer = renderer;
};

export const getSurfaceBoundaryRenderer = (): FC<SurfaceBoundaryProps> | null => boundaryRenderer;

const exactRoles = new Set<string>();
let prefixRoles: string[] = [];

/**
 * Configure which roles dispatch across a web-component boundary. A pattern is either an
 * exact role NSID or a family prefix ending in `.*` (e.g. `org.dxos.role.deckCompanion.*`).
 * Roles not listed keep today's in-tree dispatch; an empty list (the default) disables
 * boundaries entirely.
 */
export const setSurfaceBoundaryRoles = (patterns: string[]): void => {
  exactRoles.clear();
  prefixRoles = [];
  for (const pattern of patterns) {
    if (pattern.endsWith('.*')) {
      prefixRoles.push(pattern.slice(0, -1));
    } else {
      exactRoles.add(pattern);
    }
  }
};

export const isSurfaceBoundaryRole = (role: string): boolean =>
  boundaryRenderer != null && (exactRoles.has(role) || prefixRoles.some((prefix) => role.startsWith(prefix)));
