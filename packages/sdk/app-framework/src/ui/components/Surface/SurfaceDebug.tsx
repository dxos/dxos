//
// Copyright 2026 DXOS.org
//

import React, {
  type PropsWithChildren,
  type ReactNode,
  createElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { addEventListener, combine } from '@dxos/async';
import { mx } from '@dxos/ui-theme';

import { type SurfaceContext } from './context.ts';
import { surfaceMetrics } from './SurfaceMetrics.ts';

declare global {
  interface Window {
    __DX_DEBUG__?: boolean;
    __DX__?: { surfaces: (component?: string) => HTMLElement[]; mounted: () => MountedSurface[] };
  }

  // oxlint-disable-next-line no-var
  var __DX_SURFACE_DEBUG__: DebugState | undefined;
}

const DEBUG_FLAG = '__DX_DEBUG__';

/**
 * Custom element tag wrapping each React surface in debug builds.
 */
export const DX_SURFACE_TAG = 'dx-surface';

/**
 * Installs the `window.__DX__` DevTools helper. `__DX__.surfaces(component?)` returns the mounted
 * `<dx-surface>` elements (optionally filtered by `data-component`) — a console shortcut for the
 * otherwise-verbose `document.querySelectorAll('dx-surface[data-component="…"]')`.
 */
const ensureDebugApi = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.__DX__ = {
    ...window.__DX__,
    surfaces: (component?: string) =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          component ? `${DX_SURFACE_TAG}[data-component="${component}"]` : DX_SURFACE_TAG,
        ),
      ),
    // The registry's view, as the Stats companion samples it — compare with `surfaces()` when a
    // mounted surface is missing from the list.
    mounted: () => getMountedSurfaces(),
  };
};

/**
 * Whether surface debugging is enabled, via the `VITE_DEBUG` build flag or the
 * `__DX_DEBUG__` runtime global. The runtime flag is toggleable without a
 * rebuild and takes effect on the next render.
 */
export const isSurfaceDebugEnabled = (): boolean =>
  Boolean(import.meta.env?.VITE_DEBUG) || (typeof window !== 'undefined' && DEBUG_FLAG in window);

/**
 * Whether the `<dx-surface>` wrapper is rendered. Enabled in any development build (or when
 * `VITE_DEBUG` is set) so the wrapper's `data-*` attributes and `window.__DX__` helpers are available
 * for DOM inspection independent of the runtime highlight flag. Production renders no wrapper.
 */
export const isSurfaceWrapperEnabled = (): boolean =>
  Boolean(import.meta.env?.DEV) || Boolean(import.meta.env?.VITE_DEBUG);

// Notifies the overlay when the runtime highlight flag toggles: the overlay is a separate React root,
// so it does not re-render on a surface render and needs an explicit signal to redraw.
const subscribeFlag = (listener: () => void): (() => void) => {
  state.flagListeners.add(listener);
  return () => {
    state.flagListeners.delete(listener);
  };
};

/**
 * Toggles the `__DX_DEBUG__` runtime flag, which gates the visual highlight overlay (not the
 * `<dx-surface>` wrapper). The overlay redraws immediately; surfaces pick it up on their next render.
 */
export const setSurfaceDebug = (enabled: boolean): void => {
  if (typeof window === 'undefined') {
    return;
  }

  if (enabled) {
    window[DEBUG_FLAG] = true;
  } else {
    delete window[DEBUG_FLAG];
  }
  for (const listener of state.flagListeners) {
    listener();
  }
};

// The role picked in the Surfaces card: the overlay draws its surfaces bold and the card shows their
// data. Kept here, beside the flag, so the overlay (its own React root) can subscribe to it.
const subscribeSelection = (listener: () => void): (() => void) => {
  state.selectionListeners.add(listener);
  return () => {
    state.selectionListeners.delete(listener);
  };
};

/** The selected role NSID, if any. */
export const getSelectedSurfaceRole = (): string | undefined => state.selectedRole;

/** Selects a role's surfaces (`undefined` clears the selection). */
export const setSelectedSurfaceRole = (role: string | undefined): void => {
  state.selectedRole = role;
  for (const listener of state.selectionListeners) {
    listener();
  }
};

/** Subscribes to the selected role. */
export const useSelectedSurfaceRole = (): string | undefined =>
  useSyncExternalStore(subscribeSelection, getSelectedSurfaceRole, getSelectedSurfaceRole);

let elementRegistered = false;

const ensureSurfaceElement = (): void => {
  if (elementRegistered || typeof customElements === 'undefined') {
    return;
  }

  elementRegistered = true;
  if (!customElements.get(DX_SURFACE_TAG)) {
    // Defined lazily (not at module scope) so importing this module never evaluates
    // `extends HTMLElement` in non-DOM environments (node tests / SSR).
    // Zero-behavior element; `display: contents` keeps the debug wrapper layout-neutral
    // so the debug DOM matches production (which renders no wrapper).
    class DxSurfaceElement extends HTMLElement {
      connectedCallback(): void {
        this.style.display = 'contents';
      }
    }
    customElements.define(DX_SURFACE_TAG, DxSurfaceElement);
  }
};

type InfoRef = { readonly current: SurfaceContext };

type DebugEntry = {
  key: number;
  element: HTMLElement;
  infoRef: InfoRef;
};

/**
 * Singleton registry of mounted debug surfaces. Centralizes overlay rendering so
 * a single set of observers/listeners serves every surface, instead of each
 * surface mounting its own portal and observers.
 */
class SurfaceDebugManager {
  #entries = new Set<DebugEntry>();
  #snapshot: DebugEntry[] = [];
  #listeners = new Set<() => void>();
  #nextKey = 0;

  register(element: HTMLElement, infoRef: InfoRef): () => void {
    const entry: DebugEntry = { key: this.#nextKey++, element, infoRef };
    this.#entries.add(entry);
    this.#update();
    return () => {
      this.#entries.delete(entry);
      this.#update();
    };
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = (): DebugEntry[] => this.#snapshot;

  #update(): void {
    this.#snapshot = [...this.#entries];
    for (const listener of this.#listeners) {
      listener();
    }
  }
}

type DebugState = {
  manager: SurfaceDebugManager;
  flagListeners: Set<() => void>;
  selectionListeners: Set<() => void>;
  selectedRole?: string;
  overlayMounted: boolean;
};

// Held on the global so it survives HMR: a re-evaluated module would otherwise start an empty
// registry (listing only surfaces mounted afterwards) while the overlay root already in the
// document kept reading the stale module's flag and selection.
const state: DebugState = (globalThis.__DX_SURFACE_DEBUG__ ??= {
  manager: new SurfaceDebugManager(),
  flagListeners: new Set(),
  selectionListeners: new Set(),
  overlayMounted: false,
});

/** A surface currently mounted in the document, as registered by its `<dx-surface>` wrapper. */
export type MountedSurface = {
  id?: string;
  role: string;
  data?: Record<string, any>;
  /** Ids of the surfaces this one is rendered inside, innermost first (anonymous ones skipped). */
  ancestors: string[];
};

const enclosingSurfaceIds = (element: HTMLElement): string[] => {
  const ids: string[] = [];
  let node = element.parentElement?.closest<HTMLElement>(DX_SURFACE_TAG);
  while (node) {
    if (node.dataset.id) {
      ids.push(node.dataset.id);
    }
    node = node.parentElement?.closest<HTMLElement>(DX_SURFACE_TAG);
  }
  return ids;
};

const toMounted = ({ element, infoRef }: DebugEntry): MountedSurface => ({
  id: infoRef.current.id,
  role: infoRef.current.role,
  data: infoRef.current.data,
  ancestors: enclosingSurfaceIds(element),
});

/**
 * The surfaces mounted right now, without subscribing. Populated only while the wrapper is rendered
 * (dev builds, or under a profiler provider).
 */
export const getMountedSurfaces = (): MountedSurface[] => state.manager.getSnapshot().map(toMounted);

/** The mounted surfaces, re-read on every mount or unmount (never on a render, so a profiled caller cannot loop). */
export const useMountedSurfaces = (): MountedSurface[] => {
  const entries = useSyncExternalStore(state.manager.subscribe, state.manager.getSnapshot, state.manager.getSnapshot);
  return useMemo(() => entries.map(toMounted), [entries]);
};

const ensureOverlay = (): void => {
  if (state.overlayMounted || typeof document === 'undefined') {
    return;
  }
  state.overlayMounted = true;
  const root = document.createElement('div');
  root.id = 'dx-surface-overlay';
  document.body.appendChild(root);
  createRoot(root).render(<SurfaceDebugOverlay />);
};

/**
 * Measures a `display: contents` element (which has no box of its own) by unioning the border boxes
 * of its rendered children. Deliberately uses each child's own `getBoundingClientRect` rather than a
 * Range over all contents: a Range unions every descendant rect, so content overflowing an inner
 * `overflow: auto` scroll container inflates the width past the surface's visible bounds. A direct
 * child's box is clipped to its own border box, so the highlight stays tight to what is on screen.
 */
const measureContents = (element: HTMLElement): DOMRect | null => {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') {
    return null;
  }

  const boxes: DOMRect[] = [];
  const collect = (node: Element): void => {
    for (const child of node.children) {
      // A nested `display: contents` child also has no box; descend to the elements that do.
      if (getComputedStyle(child).display === 'contents') {
        collect(child);
      } else {
        const rect = child.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          boxes.push(rect);
        }
      }
    }
  };
  collect(element);

  if (boxes.length === 0) {
    return null;
  }

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const box of boxes) {
    left = Math.min(left, box.left);
    top = Math.min(top, box.top);
    right = Math.max(right, box.right);
    bottom = Math.max(bottom, box.bottom);
  }
  return new DOMRect(left, top, right - left, bottom - top);
};

const EMPTY_RECTS: ReadonlyMap<number, DOMRect> = new Map();

/**
 * Single overlay that draws boundary highlights for every registered surface.
 * One ResizeObserver plus one scroll/resize listener serve all surfaces.
 */
const SurfaceDebugOverlay = (): ReactNode => {
  const all = useSyncExternalStore(state.manager.subscribe, state.manager.getSnapshot, state.manager.getSnapshot);
  // The `__DX_DEBUG__` flag gates only this visual overlay; the `<dx-surface>` wrappers stay mounted.
  const enabled = useSyncExternalStore(subscribeFlag, isSurfaceDebugEnabled, isSurfaceDebugEnabled);
  const selected = useSelectedSurfaceRole();
  // The selection shows even with the flag off, so picking a role in the Surfaces card always points at it.
  // Memoized: the measuring effect keys on this array, so a fresh one per render would loop it.
  const entries = useMemo(
    () => (enabled ? all : all.filter((entry) => entry.infoRef.current.role === selected)),
    [all, enabled, selected],
  );
  const [rects, setRects] = useState<ReadonlyMap<number, DOMRect>>(EMPTY_RECTS);

  useLayoutEffect(() => {
    // Draw nothing (and install no listeners) while there is nothing to show.
    if (entries.length === 0) {
      setRects(EMPTY_RECTS);
      return;
    }

    const measure = () => {
      const next = new Map<number, DOMRect>();
      for (const entry of entries) {
        const rect = measureContents(entry.element);
        if (rect) {
          next.set(entry.key, rect);
        }
      }
      setRects(next);
    };

    // Guard for environments without ResizeObserver (SSR / tests); scroll/resize still drive measurement.
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : undefined;
    for (const entry of entries) {
      // The element itself has no box (display: contents); observe its parent.
      if (observer && entry.element.parentElement) {
        observer.observe(entry.element.parentElement);
      }
    }
    measure();

    return combine(addEventListener(window, 'scroll', measure, true), addEventListener(window, 'resize', measure), () =>
      observer?.disconnect(),
    );
  }, [entries]);

  return createPortal(
    <>
      {entries.map((entry) => {
        const rect = rects.get(entry.key);
        return rect ? (
          <SurfaceHighlight key={entry.key} rect={rect} selected={entry.infoRef.current.role === selected} />
        ) : null;
      })}
    </>,
    document.body,
  );
};

/** A passive outline over one surface, bold for the selected role; selection happens in the Surfaces card. */
const SurfaceHighlight = ({ rect, selected }: { rect: DOMRect; selected: boolean }): ReactNode => (
  <div
    className={mx(
      'z-40 fixed pointer-events-none border',
      selected ? 'border-2 border-error-text bg-error-text/10' : 'border-info-text',
    )}
    style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
  />
);

/**
 * Recovers the rendered surface component's name from the React fiber. Surfaces are registered as
 * anonymous `component: (props) => <Real .../>` wrappers, so the static component carries no useful
 * name; walking the fiber's child chain to the first component with a display name (as DevTools does)
 * finds the real one. The wrapper's own inferred name is the property key ('component'), so skip it.
 */
const renderedComponentName = (element: HTMLElement): string | undefined => {
  // React fiber internals are untyped; the fiber hangs off a `__reactFiber$<id>` own-property and its
  // `child` chain is the rendered subtree.
  const node = element as any;
  const fiberKey = Object.keys(node).find((key) => key.startsWith('__reactFiber$'));
  let fiber = fiberKey ? node[fiberKey]?.child : undefined;
  while (fiber) {
    const { type } = fiber;
    if (typeof type === 'function') {
      const name: string | undefined = type.displayName ?? type.name;
      if (name && name !== 'component') {
        return name;
      }
    }
    fiber = fiber.child;
  }
  return undefined;
};

/**
 * Debug wrapper that mounts each React surface inside a `<dx-surface>` element
 * and registers it with the centralized overlay. The element is named and
 * inspectable in DevTools and queryable (`document.querySelectorAll('dx-surface')`).
 */
export const DebugSurface = ({ info, children }: PropsWithChildren<{ info: SurfaceContext }>): ReactNode => {
  // The manager reads the latest info via this ref without re-registering on data change.
  const infoRef = useRef(info);
  infoRef.current = info;
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    ensureSurfaceElement();
    ensureOverlay();
    ensureDebugApi();
    const { id, role } = infoRef.current;
    if (id) {
      surfaceMetrics.recordMount(id, role);
    }
    const element = elementRef.current;
    const unregister = element ? state.manager.register(element, infoRef) : undefined;
    // Names the rendered component (`data-component`) once mounted — read from the fiber because the
    // surface wrapper is anonymous, so no static name is available at render time.
    const component = element ? renderedComponentName(element) : undefined;
    if (element && component) {
      element.setAttribute('data-component', component);
    }

    return () => {
      if (id) {
        surfaceMetrics.recordUnmount(id, role);
      }
      unregister?.();
    };
  }, []);

  return createElement(
    DX_SURFACE_TAG,
    {
      'className': 'contents',
      'data-id': info.id,
      'data-role': info.role,
      'ref': elementRef,
    },
    children,
  );
};
