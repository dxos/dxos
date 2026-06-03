//
// Copyright 2026 DXOS.org
//

declare global {
  interface Window {
    /**
     * Driver injected by `@dxos/app-framework/vite-plugin`'s `bootLoaderPlugin`
     * (a Solid app inlined into `index.html`). Declared here so the React side
     * (`App`) can drive the loader without each host re-declaring the type. The
     * canonical definition lives in the plugin's `loader-app/types.ts`; this
     * mirror exists because that source compiles in a separate (Solid) program.
     */
    __bootLoader?: {
      status: (payload: {
        event?: string;
        module?: string;
        humanized: string;
        /**
         * Optional `(index/total)` tick. When present, the loader replaces the
         * current line in place ("Loading plugins (12/80)") instead of
         * appending a new entry — keeps the visible log compact during long
         * counted phases like plugin chunk-loading or module activation.
         */
        range?: { index: number; total: number };
      }) => void;
      progress: (fraction?: number) => void;
      ready: () => void;
      dismiss: () => void;
    };
  }
}

export {};
