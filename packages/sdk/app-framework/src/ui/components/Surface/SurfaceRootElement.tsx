//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useRef } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { log } from '@dxos/log';

import { type PluginManager } from '../../../core';
import { BoundaryScopeContext, type SurfaceBoundaryProps, setSurfaceBoundaryRenderer } from './boundary';
import { SurfaceComponent } from './SurfaceComponent';
import { type SurfaceManager } from './SurfaceManager';
import { SurfaceRootProviders } from './SurfaceRootProviders';

export const DX_SURFACE_ROOT_TAG = 'dx-surface-root';

// `role` would collide with the ARIA attribute, so the dispatch role rides on `data-role`.
const ROLE_ATTR = 'data-role';

export const SURFACE_ROOT_MOUNTED_EVENT = 'dx-surface-root:mounted';
export const SURFACE_ROOT_UNMOUNTED_EVENT = 'dx-surface-root:unmounted';

export type SurfaceRootHost = {
  manager: PluginManager.PluginManager;
  surfaces: SurfaceManager;
};

export interface SurfaceRootElement extends HTMLElement {
  /** Everything besides the role: `data`, `limit`, `fallback`, `placeholder`, passthrough props. */
  surfaceProps: Record<string, any>;
}

let host: SurfaceRootHost | null = null;

export const isSurfaceRootRegistered = (): boolean => host != null;

/**
 * Registers the `<dx-surface-root>` custom element: a light-DOM boundary that hosts its own
 * React root wrapped in {@link SurfaceRootProviders}, so a surface subtree behaves as part of
 * the app without belonging to the app's React tree. Also injects the boundary renderer used
 * by the dispatcher for roles enabled via `setSurfaceBoundaryRoles`.
 */
export const registerSurfaceRootElement = (nextHost: SurfaceRootHost): void => {
  if (host && (host.manager !== nextHost.manager || host.surfaces !== nextHost.surfaces)) {
    log('surface root host re-registered with a different manager');
  }
  host = nextHost;
  setSurfaceBoundaryRenderer(SurfaceBoundary);

  if (typeof customElements === 'undefined' || customElements.get(DX_SURFACE_ROOT_TAG)) {
    return;
  }

  customElements.define(
    DX_SURFACE_ROOT_TAG,
    class extends HTMLElement implements SurfaceRootElement {
      static get observedAttributes() {
        return [ROLE_ATTR];
      }

      #root: Root | null = null;
      #surfaceProps: Record<string, any> = {};
      #renderScheduled = false;
      #capturedParent: Element | null = null;

      get surfaceProps(): Record<string, any> {
        return this.#surfaceProps;
      }

      set surfaceProps(props: Record<string, any>) {
        this.#surfaceProps = props ?? {};
        this.#scheduleRender();
      }

      connectedCallback() {
        this.#capturedParent = this.parentElement;
        this.#scheduleRender();
      }

      // The unmounted event fires after detachment, when bubbling from this element is a no-op;
      // fall back to the closest still-connected former ancestor so hosts can observe teardown.
      #dispatchLifecycle(type: string) {
        const event = new CustomEvent(type, { bubbles: true, composed: true });
        if (this.isConnected) {
          this.dispatchEvent(event);
          return;
        }
        let node: Element | null = this.#capturedParent;
        while (node && !node.isConnected) {
          node = node.parentElement;
        }
        (node ?? document).dispatchEvent(event);
      }

      disconnectedCallback() {
        // Unmounting synchronously here can land inside the parent root's commit (React
        // forbids that), and a same-task remove-and-reinsert must not tear down at all.
        queueMicrotask(() => {
          if (!this.isConnected && this.#root) {
            this.#root.unmount();
            this.#root = null;
          }
        });
      }

      attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null) {
        if (oldValue !== newValue) {
          this.#scheduleRender();
        }
      }

      #scheduleRender() {
        if (this.#renderScheduled) {
          return;
        }
        this.#renderScheduled = true;
        // Deferred a microtask so attribute + property assignment in the same task render once,
        // and so a first render never happens synchronously inside a parent React commit.
        queueMicrotask(() => {
          this.#renderScheduled = false;
          this.#render();
        });
      }

      #render() {
        if (!this.isConnected || !host) {
          return;
        }
        const role = this.getAttribute(ROLE_ATTR);
        if (role == null) {
          return;
        }
        this.#root ??= createRoot(this);
        this.#root.render(
          <SurfaceRootProviders manager={host.manager} surfaces={host.surfaces}>
            <BoundaryScopeContext.Provider value={role}>
              <SurfaceComponent type={{ role }} {...this.#surfaceProps} />
              <MountedSignal dispatch={(type) => this.#dispatchLifecycle(type)} />
            </BoundaryScopeContext.Provider>
          </SurfaceRootProviders>,
        );
      }
    },
  );
};

/**
 * Dispatches mounted/unmounted lifecycle events from inside the boundary's React root, so a
 * host can drive placeholders without sharing a Suspense boundary across roots.
 */
const MountedSignal = ({ dispatch }: { dispatch: (type: string) => void }) => {
  useEffect(() => {
    dispatch(SURFACE_ROOT_MOUNTED_EVENT);
    return () => {
      dispatch(SURFACE_ROOT_UNMOUNTED_EVENT);
    };
    // The dispatch closure is recreated per render but targets the same element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

/**
 * React-side boundary renderer: renders the custom element in place (no wrapper node) and
 * forwards everything besides the role as a single `surfaceProps` property — live objects
 * cross by reference, mirroring `WebComponentWrapper`'s property protocol.
 */
const SurfaceBoundary = ({ role, ...surfaceProps }: SurfaceBoundaryProps) => {
  const elementRef = useRef<SurfaceRootElement | null>(null);

  useEffect(() => {
    if (elementRef.current) {
      elementRef.current.surfaceProps = surfaceProps;
    }
  });

  return React.createElement(DX_SURFACE_ROOT_TAG, {
    ref: elementRef,
    [ROLE_ATTR]: role,
    style: { display: 'contents' },
  });
};
