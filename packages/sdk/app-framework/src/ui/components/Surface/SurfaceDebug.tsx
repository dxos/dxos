//
// Copyright 2026 DXOS.org
//

import React, {
  type PropsWithChildren,
  type ReactNode,
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { addEventListener, combine } from '@dxos/async';
import { mx } from '@dxos/ui-theme';

import { type SurfaceContext } from './context';
import { type SurfaceMetric, surfaceMetricKey, surfaceMetrics } from './SurfaceMetrics';

declare global {
  interface Window {
    __DX_DEBUG__?: boolean;
    __DX__?: { surfaces: (component?: string) => HTMLElement[] };
  }
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
const flagListeners = new Set<() => void>();
const subscribeFlag = (listener: () => void): (() => void) => {
  flagListeners.add(listener);
  return () => {
    flagListeners.delete(listener);
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
  for (const listener of flagListeners) {
    listener();
  }
};

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

const manager = new SurfaceDebugManager();

let overlayMounted = false;

const ensureOverlay = (): void => {
  if (overlayMounted || typeof document === 'undefined') {
    return;
  }
  overlayMounted = true;
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
  const entries = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  // The `__DX_DEBUG__` flag gates only this visual overlay; the `<dx-surface>` wrappers stay mounted.
  const enabled = useSyncExternalStore(subscribeFlag, isSurfaceDebugEnabled, isSurfaceDebugEnabled);
  const [rects, setRects] = useState<ReadonlyMap<number, DOMRect>>(EMPTY_RECTS);

  useLayoutEffect(() => {
    // Draw nothing (and install no listeners) while the flag is off or there are no surfaces.
    if (!enabled || entries.length === 0) {
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
  }, [entries, enabled]);

  if (!enabled) {
    return null;
  }

  return createPortal(
    <>
      {entries.map((entry) => {
        const rect = rects.get(entry.key);
        return rect ? <SurfaceHighlight key={entry.key} infoRef={entry.infoRef} rect={rect} /> : null;
      })}
    </>,
    document.body,
  );
};

/** Subscribes to the metric for a single surface. */
const useSurfaceMetric = (surfaceId: string, role: string): SurfaceMetric | undefined => {
  const all = useSyncExternalStore(surfaceMetrics.subscribe, surfaceMetrics.getSnapshot, surfaceMetrics.getSnapshot);
  const key = surfaceMetricKey(surfaceId, role);
  return all.find((metric) => metric.id === key);
};

const SurfaceHighlight = ({ infoRef, rect }: { infoRef: InfoRef; rect: DOMRect }): ReactNode => {
  const [expand, setExpand] = useState(false);
  const info = infoRef.current;
  const metric = useSurfaceMetric(info.id ?? '', info.role);
  // A surface with a likely problem (unstable data or a caught error) flags red.
  const concern = !!metric && (metric.dataUnstable || metric.errors > 0);
  return (
    <div
      className='z-[100] fixed flex flex-col-reverse scrollbar-none overflow-auto pointer-events-none'
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
    >
      {expand ? (
        <div
          className='absolute inset-0 border-2 border-rose-500 border-dotted overflow-auto pointer-events-auto'
          onPointerDown={(ev) => ev.stopPropagation()}
          onClick={(ev) => {
            ev.stopPropagation();
            setExpand(false);
          }}
        >
          <div className='absolute left-1 right-1 bottom-1 max-h-[20rem] overflow-auto bg-card-surface ring-2 ring-separator rounded-sm opacity-90'>
            <pre className='inline-block p-2 text-xs text-description font-mono font-thin'>
              {JSON.stringify({ info, metric }, null, 2)}
            </pre>
          </div>
        </div>
      ) : (
        <span
          className={mx(
            concern ? 'text-rose-500' : 'text-green-500',
            'absolute right-2 bottom-1 flex items-center p-1 opacity-80 hover:opacity-100 text-sm cursor-pointer pointer-events-auto',
          )}
          title={metricSummary(info.id ?? '', metric)}
          onPointerDown={(ev) => ev.stopPropagation()}
          onClick={(ev) => {
            ev.stopPropagation();
            setExpand(true);
          }}
        >
          {concern ? '⚠' : 'ⓘ'}
        </span>
      )}
    </div>
  );
};

const metricSummary = (surfaceId: string, metric: SurfaceMetric | undefined): string => {
  if (!metric) {
    return surfaceId;
  }
  const parts = [
    surfaceId,
    `dispatches=${metric.dispatches}`,
    `candidates=${metric.candidates}${metric.truncated ? '(+truncated)' : ''}`,
    `mounts=${metric.mounts}/unmounts=${metric.unmounts}`,
  ];
  if (metric.dataUnstable) {
    parts.push(`UNSTABLE data (churn=${metric.dataChurn})`);
  }
  if (metric.errors > 0) {
    parts.push(`errors=${metric.errors}`);
  }
  return parts.join(' · ');
};

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
    const unregister = element ? manager.register(element, infoRef) : undefined;
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
