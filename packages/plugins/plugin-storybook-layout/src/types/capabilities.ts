//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';

export type LayoutState = {
  sidebarState?: 'expanded' | 'collapsed' | 'closed';
  complementarySidebarState?: 'expanded' | 'collapsed' | 'closed';

  dialogOpen: boolean;
  dialogType?: 'default' | 'alert';
  dialogBlockAlign?: 'start' | 'center' | 'end';
  dialogOverlayClasses?: string;
  dialogOverlayStyle?: Record<string, any>;
  /** Data to be passed to the dialog Surface. */
  dialogContent?: any;

  popoverOpen?: boolean;
  popoverSide?: 'top' | 'right' | 'bottom' | 'left';
  popoverVariant?: 'virtual' | 'react';
  popoverAnchor?: HTMLButtonElement;
  popoverAnchorId?: string;
  popoverContent?: any;

  workspace: string;
};

export const LayoutState = Capability.make<LayoutState>(`${meta.id}/state`);
