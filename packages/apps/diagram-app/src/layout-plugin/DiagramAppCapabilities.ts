//
// Copyright 2026 DXOS.org
//

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import type * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';

import { type Route } from '../shared/index.ts';
import { DIAGRAM_APP_KEY } from './DiagramAppEvents.ts';

/** Where a popover sits: beside an element, or beside whichever part renders the anchor with this id. */
export type PopoverAnchor = { anchor: Element; anchorId?: undefined } | { anchor?: undefined; anchorId: string };

/** The layout's state: the open space and diagram, and the dialog, popover and toasts other plugins ask for. */
export type LayoutState = {
  route: Route;
  dialogOpen: boolean;
  dialogType: 'default' | 'alert';
  /** The dialog surface's data: the component's id and its props. */
  dialogContent?: { component: string; props?: Record<string, any> };
  /** Counts the dialogs the user dismissed, as against those an operation closed. */
  dialogDismissals: number;
  popoverOpen: boolean;
  popoverKind: 'base' | 'card' | 'rename';
  /** The popover surface's data: a component's id and its props, or a subject. */
  popoverContent?: { component: string; props?: unknown } | { subject: unknown };
  popoverAnchor?: PopoverAnchor;
  popoverSide?: 'top' | 'right' | 'bottom' | 'left';
  /** The Share dialog is open: the app's one panel beside the canvas, listing the space's members. */
  sharing: boolean;
  toasts: LayoutOperation.Toast[];
  workspace: string;
};

export const LayoutState = Capability.makeSingleton<Atom.Writable<LayoutState>>()(
  `${DIAGRAM_APP_KEY}.capability.layoutState`,
);
