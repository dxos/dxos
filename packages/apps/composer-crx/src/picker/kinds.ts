//
// Copyright 2026 DXOS.org
//

import { type ClipKind } from '../clip/types';

export type ClipKindDef = {
  kind: ClipKind;
  label: string;
  /**
   * Phosphor icon symbol name, as emitted into the extension's icon sprite
   * by `@dxos/vite-plugin-icons`. Rendered via `Domino.svg()`; the picker
   * sets `Domino.iconsUrl` to the extension's runtime URL so the sprite
   * resolves even when the picker is injected into an arbitrary page.
   */
  icon: string;
};

/**
 * Ordered list of kinds the picker offers. Adding a new kind is one entry
 * here plus the corresponding branches in the bridge plugin's
 * `mapping.ts` + `Clip.SUPPORTED_KINDS`.
 */
export const CLIP_KINDS: readonly ClipKindDef[] = [
  { kind: 'person', label: 'Person', icon: 'ph--user--regular' },
  { kind: 'organization', label: 'Organization', icon: 'ph--building-office--regular' },
  { kind: 'note', label: 'Note', icon: 'ph--note--regular' },
];
