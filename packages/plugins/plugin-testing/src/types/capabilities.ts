//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type Label } from '@dxos/react-ui';

import { meta } from '../meta';

export type LayoutStateProps = {
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
  popoverKind?: 'base' | 'card';
  popoverTitle?: Label;
  popoverContent?: any;

  workspace: string;
};

export const LayoutState = Capability.make<Atom.Writable<LayoutStateProps>>(`${meta.id}/state`);
