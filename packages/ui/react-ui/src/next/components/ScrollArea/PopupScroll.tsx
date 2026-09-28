//
// Copyright 2026 DXOS.org
//

import React, { type ReactElement, type ReactNode } from 'react';

import { mx } from '@dxos/ui-theme';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { ScrollArea } from './ScrollArea.tsx';

export type PopupScrollProps = {
  size?: Size;
  classNames?: string;
  /** The Ark Content, which becomes the scrolling viewport: zag scrolls its highlighted item into view only there. */
  children: ReactElement;
  /** Parts drawn outside the viewport (an arrow), which its overflow would otherwise clip. */
  outside?: ReactNode;
};

/**
 * The frame of a scrolling popup (Menu, Select, Combobox; DESIGN.md follow-up 49): a thin overlay ScrollArea that is
 * also the popup surface, sized and levelled like any `.nx-popup`, with the portalled Content as its viewport.
 */
export const PopupScroll = ({ size, classNames, children, outside }: PopupScrollProps) => (
  <ScrollArea.Root data-surface='popup' size={size} width='thin' classNames={mx(recipes.popup(), classNames)}>
    <ScrollArea.Viewport asChild>{children}</ScrollArea.Viewport>
    {outside}
  </ScrollArea.Root>
);
