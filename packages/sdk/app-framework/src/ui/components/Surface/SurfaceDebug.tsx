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

import { type SurfaceContext } from './context';
import { type SurfaceMetric, surfaceMetricKey, surfaceMetrics } from './SurfaceMetrics';

declare global {
  interface Window {
    __DX_DEBUG__?: boolean;
  }
}

const DEBUG_FLAG = '__DX_DEBUG__';

/**
 * Custom element tag wrapping each React surface in debug builds.
 */
export const DX_SURFACE_TAG = 'dx-surface';

/**
 * Whether surface debugging is enabled, via the `VITE_DEBUG` build flag or the
 * `__DX_DEBUG__` runtime global. The runtime flag is toggleable without a
 * rebuild and takes effect on the next render.
 */
export const isSurfaceDebugEnabled = (): boolean =>
  Boolean(import.meta.env?.VITE_DEBUG) || (typeof window !== 'undefined' && DEBUG_FLAG in window);

/**
 * Toggles the `__DX_DEBUG__` runtime flag. Surfaces pick up the change on their
 * next render.
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
 * Measures the contents of a `display: contents` element (which has no box of
 * its own) via a Range spanning its children.
 */
const measureContents = (element: HTMLElement): DOMRect | null => {
  if (typeof document === 'undefined' || typeof document.createRange !== 'function') {
    return null;
  }
  const range = document.createRange();
  range.selectNodeContents(element);
  // Range.getBoundingClientRect is unavailable in some non-browser DOMs (tests / SSR).
  if (typeof range.getBoundingClientRect !== 'function') {
    return null;
  }
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0) {
    return null;
  }
  return rect;
};

const EMPTY_RECTS: ReadonlyMap<number, DOMRect> = new Map();

/**
 * Single overlay that draws boundary highlights for every registered surface.
 * One ResizeObserver plus one scroll/resize listener serve all surfaces.
 */
const SurfaceDebugOverlay = (): ReactNode => {
  const entries = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  const [rects, setRects] = useState<ReadonlyMap<number, DOMRect>>(EMPTY_RECTS);

  useLayoutEffect(() => {
    // No registered surfaces: clear rects and install no global listeners.
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
          <pre className='absolute left-2 bottom-2 bg-card-surface inline-block ring-2 ring-separator opacity-80 p-2 text-xs text-description font-mono'>
            {JSON.stringify({ info, metric }, null, 2)}
          </pre>
        </div>
      ) : (
        <span
          className={
            (concern ? 'text-rose-500' : 'text-green-500') +
            ' absolute right-1 bottom-0 flex items-center p-1 opacity-80 hover:opacity-100 text-sm cursor-pointer pointer-events-auto'
          }
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
    const { id, role } = infoRef.current;
    if (id) {
      surfaceMetrics.recordMount(id, role);
    }
    const element = elementRef.current;
    const unregister = element ? manager.register(element, infoRef) : undefined;
    return () => {
      if (id) {
        surfaceMetrics.recordUnmount(id, role);
      }
      unregister?.();
    };
  }, []);

  return createElement(DX_SURFACE_TAG, { 'ref': elementRef, 'data-id': info.id, 'data-role': info.role }, children);
};
