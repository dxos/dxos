//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SPRITE_URL = '/icons.svg';
const PHOSPHOR_BASE = '/phosphor';

const SYMBOL_PATTERN = /^([a-z0-9]+)--([a-z0-9-]+)--(bold|duotone|fill|light|regular|thin)$/;

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

const buildPhosphorUrl = (iconName: string, variant: string): string => {
  const suffix = variant === 'regular' ? '' : `-${variant}`;
  return `${PHOSPHOR_BASE}/${variant}/${iconName}${suffix}.svg`;
};

type RegistryState = {
  defs: SVGSVGElement;
  loaded: Set<string>;
  inflight: Map<string, Promise<void>>;
  staticReady: Promise<void>;
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
  // Phosphor sources don't set fill; the sprite convention is fill="currentColor" on each symbol.
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

const resolveDynamic = async (state: RegistryState, name: string): Promise<void> => {
  // Wait until the static sprite has been ingested before deciding to fetch — the icon may already be present.
  await state.staticReady;
  if (state.loaded.has(name)) {
    return;
  }
  const parsed = parseSymbolName(name);
  if (!parsed || parsed.iconSet !== 'ph') {
    // For now, only auto-resolve Phosphor icons via the public /phosphor/ tree.
    // Custom prefixes (dx--, plugin namespaces) must be in the static sprite.
    return;
  }
  let svgText: string;
  try {
    const response = await fetch(buildPhosphorUrl(parsed.iconName, parsed.variant));
    if (!response.ok) {
      return;
    }
    svgText = await response.text();
  } catch {
    return;
  }
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const symbol = ingestSvgChildrenAsSymbol(doc.documentElement, name);
  if (!symbol) {
    return;
  }
  state.defs.appendChild(symbol);
  state.loaded.add(name);
};

const createRegistry = (): RegistryHandle => {
  const defs = createDefsContainer();
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };
  const state: RegistryState = {
    defs,
    loaded: new Set<string>(),
    inflight: new Map<string, Promise<void>>(),
    staticReady: undefined as unknown as Promise<void>,
  };
  state.staticReady = loadStaticSprite(state).then(notify);

  const registry: IconRegistry = {
    hasIcon: (name) => state.loaded.has(name),
    requestIcon: (name) => {
      if (state.loaded.has(name) || state.inflight.has(name)) {
        return;
      }
      const promise = resolveDynamic(state, name)
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

export const IconRegistryProvider = ({ children }: PropsWithChildren) => {
  const [registry, setRegistry] = useState<IconRegistry>(NoopRegistry);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const handle = createRegistry();
    setActiveRegistry(handle.registry);
    setRegistry(handle.registry);
    return () => {
      if (getIconRegistry() === handle.registry) {
        setActiveRegistry(undefined);
      }
      handle.dispose();
    };
  }, []);

  const value = useMemo(() => registry, [registry]);
  return <IconRegistryContext.Provider value={value}>{children}</IconRegistryContext.Provider>;
};
