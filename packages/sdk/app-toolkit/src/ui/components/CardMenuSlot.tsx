//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { type MenuActions } from '@dxos/react-ui-menu';

import * as AppSurface from './app-surface.ts';

export type CardMenuSlotProps = {
  /** The object being depicted. */
  subject: unknown;
  /** The menu the card header renders; contributions register their items with it. */
  menu: MenuActions;
};

/**
 * Lets any plugin add items to a card header's menu. Renders every {@link AppSurface.CardMenu}
 * contribution for the subject, each of which calls `useMenuContribution(menu, …)` and renders nothing.
 */
export const CardMenuSlot = ({ subject, menu }: CardMenuSlotProps) => (
  <Surface.Surface type={AppSurface.CardMenu} data={{ subject, menu }} />
);

CardMenuSlot.displayName = 'CardMenuSlot';
