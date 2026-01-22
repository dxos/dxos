//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { OperationResolver } from '@dxos/operation';

import { LayoutState } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateSidebar,
        handler: Effect.fnUntraced(function* ({ state }) {
          const layout = yield* Capability.get(LayoutState);
          const next = state ?? layout.sidebarState;
          if (next !== layout.sidebarState) {
            layout.sidebarState = next;
          }
        }),
      }),
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateComplementary,
        handler: Effect.fnUntraced(function* ({ state }) {
          const layout = yield* Capability.get(LayoutState);
          const next = state ?? layout.complementarySidebarState;
          if (next !== layout.complementarySidebarState) {
            layout.complementarySidebarState = next;
          }
        }),
      }),
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateDialog,
        handler: Effect.fnUntraced(function* ({
          subject,
          state,
          type,
          blockAlign,
          overlayClasses,
          overlayStyle,
          props,
        }) {
          const layout = yield* Capability.get(LayoutState);
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
        handler: Effect.fnUntraced(function* (input) {
          const layout = yield* Capability.get(LayoutState);
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
        handler: Effect.fnUntraced(function* ({ subject }) {
          const layout = yield* Capability.get(LayoutState);
          layout.workspace = subject;
        }),
      }),
    ]);
  }),
);
