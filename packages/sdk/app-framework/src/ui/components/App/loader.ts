//
// Copyright 2026 DXOS.org
//

declare global {
  interface BootLoader {
    status: (payload: {
      event?: string;
      module?: string;
      humanized: string;
      /**
       * Optional `(index/total)` tick. When present, the loader replaces the
       * current line in place ("Loading plugins (12/80)") instead of appending
       * a new entry — keeps the visible log compact during long counted phases.
       */
      range?: { index: number; total: number };
    }) => void;
    progress: (fraction?: number) => void;
    ready: () => void;
    dismiss: () => void;
  }

  interface Window {
    /**
     * Driver injected by `@dxos/app-framework/vite-plugin`'s `bootLoaderPlugin`
     * (a Solid app inlined into `index.html`). Declared here — on a module that
     * is part of the `@dxos/app-framework/ui` export surface — so the React side
     * and host apps (e.g. composer-app) can drive the loader without each
     * re-declaring the type. The canonical definition lives in the plugin's
     * `loader-app/types.ts`; this mirror exists because that source compiles in a
     * separate (Solid) program that doesn't ship its globals to consumers.
     */
    __bootLoader?: BootLoader;
  }
}

// Guarded: `@dxos/app-framework/ui` has a `node` export and this module is re-exported through the
// UI barrel, so a bare top-level `window` read would throw when imported in SSR / tests / tooling.
export const bootLoader = typeof window !== 'undefined' ? window.__bootLoader : undefined;
