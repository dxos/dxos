//
// Copyright 2026 DXOS.org
//

export type PreviewPluginOptions = {
  /**
   * Origin of a build carrying every plugin, used by the unsupported-type stand-in to offer somewhere
   * an object CAN be opened. Set only by a curated plugin set (`plugin-defs.production.tsx`); a
   * full-catalog build leaves it unset, because it is that destination.
   */
  extensibleAppUrl?: string;
};
