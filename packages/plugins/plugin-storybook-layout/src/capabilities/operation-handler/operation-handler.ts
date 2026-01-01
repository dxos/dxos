//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';

import { LayoutState } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationHandler, [
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateSidebar,
        handler: ({ state }) =>
          Effect.sync(() => {
            const layout = context.getCapability(LayoutState);
            const next = state ?? layout.sidebarState;
            if (next !== layout.sidebarState) {
              layout.sidebarState = next;
            }
          }),
      }),
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateComplementary,
        handler: ({ state }) =>
          Effect.sync(() => {
            const layout = context.getCapability(LayoutState);
            const next = state ?? layout.complementarySidebarState;
            if (next !== layout.complementarySidebarState) {
              layout.complementarySidebarState = next;
            }
          }),
      }),
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateDialog,
        handler: ({ subject, state, type, blockAlign, overlayClasses, overlayStyle, props }) =>
          Effect.sync(() => {
            const layout = context.getCapability(LayoutState);
            layout.dialogOpen = state ?? Boolean(subject);
            layout.dialogType = type ?? 'default';
            layout.dialogBlockAlign = blockAlign ?? 'center';
            layout.dialogOverlayClasses = overlayClasses;
            layout.dialogOverlayStyle = overlayStyle;
            layout.dialogContent = subject ? { component: subject, props } : null;
          }),
      }),
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdatePopover,
        handler: (input) =>
          Effect.sync(() => {
            const layout = context.getCapability(LayoutState);
            const { subject, state, side, props } = input;
            layout.popoverContent =
              typeof subject === 'string' ? { component: subject, props } : subject ? { subject } : undefined;
            layout.popoverOpen = state ?? Boolean(subject);
            layout.popoverSide = side;
            if ('variant' in input && input.variant === 'virtual') {
              layout.popoverVariant = 'virtual';
              layout.popoverAnchor = input.anchor;
            } else if ('anchorId' in input) {
              layout.popoverVariant = 'react';
              layout.popoverAnchorId = input.anchorId;
            }
          }),
      }),
      OperationResolver.make({
        operation: Common.LayoutOperation.SwitchWorkspace,
        handler: ({ subject }) =>
          Effect.sync(() => {
            const layout = context.getCapability(LayoutState);
            layout.workspace = subject;
          }),
      }),
    ]),
  ),
);
