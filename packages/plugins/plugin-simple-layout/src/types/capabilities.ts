//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type DrawerState, type Label } from '@dxos/react-ui';

import { meta } from '../meta';

// TODO(wittjosiah): Handle toasts.
export type SimpleLayoutState = {
  /** Data to be passed to the main content Surface. */
  content?: any;

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
  previousWorkspace: string;
  active?: string;
  /** Stack of previously active item IDs for back navigation. */
  history: string[];

  /** Whether running in popover window context (hides mobile-specific UI). */
  isPopover?: boolean;

  /** Variant of the companion to display in the drawer (e.g., "comments", "assistant-chat"). */
  companionVariant?: string;
  /** State of the companion drawer. */
  drawerState?: DrawerState;
};

export const SimpleLayoutState = Capability.make<Atom.Writable<SimpleLayoutState>>(`${meta.id}/state`);
