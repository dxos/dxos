//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation, OperationHandlerSet } from '@dxos/operation';
import type { OperationHandlerSet as OperationHandlerSet$ } from '@dxos/operation';

import { LayoutState } from '../../types';

export default Capability.makeModule<OperationHandlerSet$.OperationHandlerSet>(
  Effect.fnUntraced(function* () {
    const layout = yield* Capability.get(LayoutState);
    return Capability.contributes(
      Capabilities.OperationHandler,
      OperationHandlerSet.make(
        Operation.withHandler(LayoutOperation.UpdateSidebar, ({ state }) =>
          Effect.sync(() => {
            const next = state ?? layout.sidebarState;
            if (next !== layout.sidebarState) {
              layout.sidebarState = next;
            }
          }),
        ),
        Operation.withHandler(LayoutOperation.UpdateComplementary, ({ state }) =>
          Effect.sync(() => {
            const next = state ?? layout.complementarySidebarState;
            if (next !== layout.complementarySidebarState) {
              layout.complementarySidebarState = next;
            }
          }),
        ),
        Operation.withHandler(
          LayoutOperation.UpdateDialog,
          ({ subject, state, type, blockAlign, overlayClasses, overlayStyle, props }) =>
            Effect.sync(() => {
              layout.dialogOpen = state ?? Boolean(subject);
              layout.dialogType = type ?? 'default';
              layout.dialogBlockAlign = blockAlign ?? 'center';
              layout.dialogOverlayClasses = overlayClasses;
              layout.dialogOverlayStyle = overlayStyle;
              layout.dialogContent = subject ? { component: subject, props } : null;
            }),
        ),
        Operation.withHandler(LayoutOperation.UpdatePopover, (input) =>
          Effect.sync(() => {
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
        ),
        Operation.withHandler(LayoutOperation.SwitchWorkspace, ({ subject }) =>
          Effect.sync(() => {
            layout.workspace = subject;
          }),
        ),
      ),
    );
  }),
);
