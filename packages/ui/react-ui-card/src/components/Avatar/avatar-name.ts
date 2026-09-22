//
// Copyright 2026 DXOS.org
//

import { type Actor } from '@dxos/types';
import { toHue } from '@dxos/util';

import { hashString } from '../../util.ts';

// Kept out of `Avatar.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/** Canonical display name for an actor — the avatar glyph fallback and the hue key are both derived from it. */
export const avatarName = (actor?: Actor.Actor): string =>
  actor?.contact?.target?.fullName ?? actor?.name ?? actor?.email ?? '';

/** Single source for a name→hue mapping, so the same sender is one color across every surface. */
export const nameToHue = (name?: string): string => toHue(hashString(name));
