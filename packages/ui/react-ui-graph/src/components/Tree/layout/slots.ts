//
// Copyright 2026 DXOS.org
//

export type TreeLayoutSlots = {
  node?: string;
  path?: string;
  text?: string;
  /**
   * Per-leaf fill colour derived from the node's `data` (e.g. by domain object type); when it returns
   * a value it overrides the `node` slot's fill. Keeps the layouts domain-agnostic — the consumer
   * injects the mapping (e.g. plugin-explorer's `getNodeFillForObject`).
   */
  nodeFill?: (data: unknown) => string | null | undefined;
};

export const defaultTreeLayoutSlots: TreeLayoutSlots = {
  // Cursor + transition so the hover swap reads clearly; SVG circles support the `:hover` pseudo-class
  // via Tailwind variants exactly like HTML elements.
  node: 'fill-blue-600 hover:fill-orange-500 cursor-pointer transition-colors',
  // 0.5px is fine on a white background, but on a dark Storybook background the lines disappear.
  // Use stroke-1 with opacity 50% so they read in both themes; dx-bundle-dim/out/in further tune on hover.
  path: 'fill-none stroke-blue-500/50 stroke-[1px] dark:stroke-blue-400/60',
  text: 'fill-neutral-700 dark:fill-neutral-300 text-xs hover:fill-orange-500 cursor-pointer transition-colors',
};
