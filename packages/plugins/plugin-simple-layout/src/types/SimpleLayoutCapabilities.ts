//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type Label } from '@dxos/react-ui';

import { meta } from '#meta';

export type DrawerState = 'closed' | 'open' | 'expanded';

export type SimpleLayoutState = {
  content?: any;
  previousWorkspace: string;
  workspace: string;
  active?: string;
  dialogOpen: boolean;
  dialogType?: 'default' | 'alert';
  dialogBlockAlign?: 'start' | 'center' | 'end';
  dialogOverlayClasses?: string;
  dialogOverlayStyle?: Record<string, any>;
  dialogContent?: { component: string; props?: any } | null;
  popoverOpen?: boolean;
  popoverSide?: 'top' | 'right' | 'bottom' | 'left';
  popoverVariant?: 'virtual' | 'react';
  popoverAnchor?: HTMLButtonElement;
  popoverAnchorId?: string;
  popoverKind?: 'base' | 'card' | 'rename';
  popoverTitle?: Label;
  popoverContent?: { component: string; props?: any } | { subject: any } | null;
  drawerState: DrawerState;
  history: string[];
  isPopover?: boolean;
  companionVariant?: string;
};

export const State = Capability.make<Atom.Writable<SimpleLayoutState>>(`${meta.profile.key}.state`);
