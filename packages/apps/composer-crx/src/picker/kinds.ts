//
// Copyright 2026 DXOS.org
//

import { type ClipKind } from '../clip/types';

export type ClipKindDef = {
  kind: ClipKind;
  label: string;
  /**
   * Emoji used in the picker toolbar. Kept as a literal character (rather
   * than a Phosphor icon name) so the picker doesn't need the DXOS icon
   * sprite, which isn't available to content scripts on arbitrary pages.
   */
  icon: string;
};

/**
 * Ordered list of kinds the picker offers. Adding a new kind is one entry
 * here plus the corresponding branches in the bridge plugin's
 * `mapping.ts` + `Clip.SUPPORTED_KINDS`.
 */
export const CLIP_KINDS: readonly ClipKindDef[] = [
  { kind: 'person', label: 'Person', icon: '👤' },
  { kind: 'organization', label: 'Organization', icon: '🏢' },
  { kind: 'note', label: 'Note', icon: '📝' },
];
