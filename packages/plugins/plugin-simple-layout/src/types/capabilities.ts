//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

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
  popoverContent?: any;

  workspace: string;
  previousWorkspace: string;
  active?: string;

  /** Whether running in popover window context (hides mobile-specific UI). */
  isPopover?: boolean;
};

export const SimpleLayoutState = Capability.make<SimpleLayoutState>(`${meta.id}/state`);
