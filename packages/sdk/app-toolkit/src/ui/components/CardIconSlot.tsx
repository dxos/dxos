//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Surface } from '@dxos/app-framework/ui';

import * as AppSurface from './app-surface.ts';

export type CardIconSlotProps = PropsWithChildren<{
  /** The object being depicted. */
  subject: unknown;
}>;

/**
 * The card header's leading slot: a type's contributed depiction when it has one, else the host's
 * own default.
 *
 * Exists because {@link AppSurface.CardIcon} cannot use a bare `Surface` the way `CardContent` does.
 * A card with no contributed body renders no body, which is fine; a card with no contributed icon
 * still needs one, and `Surface`'s `fallback` is the error boundary rather than the not-contributed
 * case. So the check and the default travel together here instead of being spelled out — differently
 * — at each of the four hosts.
 *
 * The default stays with the host as `children` rather than being fixed here, because the hosts
 * genuinely disagree: a record plank shows a plain glyph, a tile shows the object's picture through
 * `ObjectAvatar`. Only the override is shared.
 */
export const CardIconSlot = ({ subject, children }: CardIconSlotProps) => {
  const isAvailable = Surface.useIsAvailable();
  const data = { subject };

  return isAvailable({ type: AppSurface.CardIcon, data }) ? (
    <Surface.Surface type={AppSurface.CardIcon} data={data} limit={1} />
  ) : (
    <>{children}</>
  );
};

CardIconSlot.displayName = 'CardIconSlot';
