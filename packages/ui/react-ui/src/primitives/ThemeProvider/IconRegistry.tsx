//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useEffect, useState } from 'react';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SPRITE_URL = '/icons.svg';

const SYMBOL_PATTERN = /^([a-z0-9]+)--([a-z0-9-]+)--([a-z]+)$/;

/**
 * Locates the standalone SVG for one icon set, so glyphs missing from the static sprite can be
 * fetched at runtime. The route must be served by the host (see the `assets` option of
 * `@dxos/vite-plugin-icons`); sets without a source stay sprite-only.
 */
export type IconSource = {
  /** Symbol-name prefix, e.g. `ph` for `ph--house--regular`. */
  iconSet: string;
  /** Resolves a parsed symbol name to a URL. */
  url: (name: string, variant: string) => string;
};

/**
 * Phosphor's published layout: `{variant}/{name}[-{variant}].svg`, regular being unsuffixed.
 */
export const phosphorIconSource = (route = '/phosphor'): IconSource => ({
  iconSet: 'ph',
  url: (name, variant) => `${route}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`,
});

const defaultSources: IconSource[] = [phosphorIconSource()];

export type IconRegistry = {
  hasIcon(name: string): boolean;
  requestIcon(name: string): void;
  /**
   * Subscribe to changes — fires whenever a new symbol becomes available (static sprite
   * finished ingesting, or a runtime fetch resolved). Returns an unsubscribe function.
   */
  subscribe(listener: () => void): () => void;
};

const NoopRegistry: IconRegistry = {
  hasIcon: () => false,
  requestIcon: () => {},
  subscribe: () => () => {},
};

const IconRegistryContext = createContext<IconRegistry>(NoopRegistry);

// Singleton bridge so non-React renderers (Lit's <dx-icon>, etc.) and packages that don't
// depend on @dxos/react-ui can access the same registry. The convention is intentionally a
// globalThis property so that any package can read it without importing from this module.
const REGISTRY_GLOBAL = '__dxIconRegistry' as const;

type RegistryHost = { [REGISTRY_GLOBAL]?: IconRegistry };

const getHost = (): RegistryHost => globalThis as unknown as RegistryHost;

const setActiveRegistry = (registry: IconRegistry | undefined): void => {
  const host = getHost();
  if (registry === undefined) {
    delete host[REGISTRY_GLOBAL];
  } else {
    host[REGISTRY_GLOBAL] = registry;
  }
};

export const getIconRegistry = (): IconRegistry => getHost()[REGISTRY_GLOBAL] ?? NoopRegistry;

export const useIconRegistry = (): IconRegistry => useContext(IconRegistryContext);

type RegistryHandle = {
  registry: IconRegistry;
  dispose: () => void;
};

const createDefsContainer = (): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('data-dx-icon-sprite', '');
  svg.style.position = 'absolute';
  svg.style.width = '0';
  svg.style.height = '0';
  svg.style.overflow = 'hidden';
  document.body.appendChild(svg);
  return svg;
};

const parseSymbolName = (name: string) => {
  const match = name.match(SYMBOL_PATTERN);
  if (!match) {
    return undefined;
  }
  return { iconSet: match[1], iconName: match[2], variant: match[3] };
};

type RegistryState = {
  defs: SVGSVGElement;
  sources: IconSource[];
  loaded: Set<string>;
  inflight: Map<string, Promise<void>>;
  // Permanent misses (no source for the set, 404, malformed source) — never re-fetched, so a
  // component that re-renders with a bad icon name doesn't produce repeated network churn.
  failed: Set<string>;
};

const ingestSvgChildrenAsSymbol = (sourceSvg: Element, id: string): SVGSymbolElement | undefined => {
  if (sourceSvg.tagName.toLowerCase() !== 'svg') {
    return undefined;
  }
  const symbol = document.createElementNS(SVG_NS, 'symbol') as SVGSymbolElement;
  symbol.setAttribute('id', id);
  const viewBox = sourceSvg.getAttribute('viewBox');
  if (viewBox) {
    symbol.setAttribute('viewBox', viewBox);
  }
  // Standalone sources don't set fill; the sprite convention is fill="currentColor" on each symbol.
  symbol.setAttribute('fill', 'currentColor');
  for (const child of Array.from(sourceSvg.children)) {
    symbol.appendChild(child.cloneNode(true));
  }
  return symbol;
};

const loadStaticSprite = async (state: RegistryState): Promise<void> => {
  let text: string;
  try {
    const response = await fetch(SPRITE_URL);
    if (!response.ok) {
      return;
    }
    text = await response.text();
  } catch {
    return;
  }
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== 'svg') {
    return;
  }
  for (const child of Array.from(root.children)) {
    const node = state.defs.ownerDocument.importNode(child, true);
    state.defs.appendChild(node);
  }
  for (const symbol of state.defs.querySelectorAll('symbol[id]')) {
    state.loaded.add(symbol.id);
  }
};

const resolveDynamic = async (state: RegistryState, staticReady: Promise<void>, name: string): Promise<void> => {
  // Wait until the static sprite has been ingested before deciding to fetch — the icon may already be present.
  await staticReady;
  if (state.loaded.has(name)) {
    return;
  }
  const parsed = parseSymbolName(name);
  const source = parsed && state.sources.find(({ iconSet }) => iconSet === parsed.iconSet);
  if (!parsed || !source) {
    // Sets without a configured source (custom brand glyphs, plugin namespaces) are sprite-only.
    state.failed.add(name);
    return;
  }
  let svgText: string;
  try {
    const response = await fetch(source.url(parsed.iconName, parsed.variant));
    if (!response.ok) {
      if (response.status === 404) {
        state.failed.add(name);
      }
      return;
    }
    svgText = await response.text();
  } catch {
    // Network errors are transient — leave the name eligible for a retry.
    return;
  }
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const symbol = ingestSvgChildrenAsSymbol(doc.documentElement, name);
  if (!symbol) {
    state.failed.add(name);
    return;
  }
  state.defs.appendChild(symbol);
  state.loaded.add(name);
};

const createRegistry = (sources: IconSource[]): RegistryHandle => {
  const defs = createDefsContainer();
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };
  const state: RegistryState = {
    defs,
    sources,
    loaded: new Set<string>(),
    inflight: new Map<string, Promise<void>>(),
    failed: new Set<string>(),
  };
  const staticReady = loadStaticSprite(state).then(notify);

  const registry: IconRegistry = {
    hasIcon: (name) => state.loaded.has(name),
    requestIcon: (name) => {
      if (state.loaded.has(name) || state.inflight.has(name) || state.failed.has(name)) {
        return;
      }
      const promise = resolveDynamic(state, staticReady, name)
        .then(notify)
        .finally(() => {
          state.inflight.delete(name);
        });
      state.inflight.set(name, promise);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return {
    registry,
    dispose: () => {
      listeners.clear();
      defs.remove();
    },
  };
};

// Refcounted document-level singleton: ThemeProvider mounts many times in one document
// (editor tooltip roots, the shell, dialogs), and a registry per mount would re-fetch the
// static sprite and duplicate every symbol id in the DOM on each mount.
type SharedRegistry = RegistryHandle & { refCount: number };

let sharedRegistry: SharedRegistry | undefined;

const acquireRegistry = (sources: IconSource[]): { registry: IconRegistry; release: () => void } => {
  if (!sharedRegistry) {
    sharedRegistry = { ...createRegistry(sources), refCount: 0 };
    setActiveRegistry(sharedRegistry.registry);
  }
  const handle = sharedRegistry;
  handle.refCount += 1;
  let released = false;
  return {
    registry: handle.registry,
    release: () => {
      if (released) {
        return;
      }
      released = true;
      handle.refCount -= 1;
      if (handle.refCount === 0 && sharedRegistry === handle) {
        sharedRegistry = undefined;
        if (getIconRegistry() === handle.registry) {
          setActiveRegistry(undefined);
        }
        handle.dispose();
      }
    },
  };
};

export type IconRegistryProviderProps = PropsWithChildren<{
  /**
   * Icon sets resolvable at runtime; defaults to Phosphor at `/phosphor`. Only the first
   * mounted provider's sources apply, since the registry is shared across a document.
   */
  sources?: IconSource[];
}>;

/**
 * Provides the shared icon registry to descendants (consumed by `useIconHref`), acquiring
 * the refcounted document-level singleton on mount and releasing it on unmount.
 */
export const IconRegistryProvider = ({ children, sources = defaultSources }: IconRegistryProviderProps) => {
  const [registry, setRegistry] = useState<IconRegistry>(NoopRegistry);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const { registry, release } = acquireRegistry(sources);
    setRegistry(registry);
    return release;
    // Sources are read once when the shared registry is created; later changes are ignored by design.
  }, []);

  return <IconRegistryContext.Provider value={registry}>{children}</IconRegistryContext.Provider>;
};
