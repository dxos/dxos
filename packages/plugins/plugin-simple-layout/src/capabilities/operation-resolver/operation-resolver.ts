//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Operation, OperationResolver } from '@dxos/operation';

import { SimpleLayoutState } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Common.Capability.OperationResolver, [
      //
      // UpdateSidebar - No-op for simple layout.
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateSidebar,
        handler: () => Effect.void,
      }),

      //
      // UpdateComplementary - No-op for simple layout.
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateComplementary,
        handler: () => Effect.void,
      }),

      //
      // UpdateDialog
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateDialog,
        handler: Effect.fnUntraced(function* (input) {
          const layout = yield* Capability.get(SimpleLayoutState);
          layout.dialogOpen = input.state ?? Boolean(input.subject);
          layout.dialogType = input.type ?? 'default';
          layout.dialogBlockAlign = input.blockAlign ?? 'center';
          layout.dialogOverlayClasses = input.overlayClasses;
          layout.dialogOverlayStyle = input.overlayStyle;
          layout.dialogContent = input.subject ? { component: input.subject, props: input.props } : null;
        }),
      }),

      //
      // UpdatePopover
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdatePopover,
        handler: Effect.fnUntraced(function* (input) {
          const layout = yield* Capability.get(SimpleLayoutState);
          layout.popoverOpen = input.state ?? Boolean(input.subject);
          layout.popoverContent =
            typeof input.subject === 'string'
              ? { component: input.subject, props: input.props }
              : input.subject
                ? { subject: input.subject }
                : undefined;
          layout.popoverSide = input.side;
          layout.popoverVariant = input.variant;
          if (input.variant === 'virtual') {
            layout.popoverAnchor = input.anchor;
          } else {
            layout.popoverAnchorId = input.anchorId;
          }
        }),
      }),

      //
      // SwitchWorkspace
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.SwitchWorkspace,
        handler: Effect.fnUntraced(function* (input) {
          const layout = yield* Capability.get(SimpleLayoutState);
          // TODO(wittjosiah): This is a hack to prevent the previous deck from being set for pinned items.
          //  Ideally this should be worked into the data model in a generic way.
          if (!layout.workspace.startsWith('!')) {
            layout.previousWorkspace = layout.workspace;
          }
          layout.workspace = input.subject;
          layout.active = undefined;
        }),
      }),

      //
      // RevertWorkspace
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.RevertWorkspace,
        handler: Effect.fnUntraced(function* () {
          const layout = yield* Capability.get(SimpleLayoutState);
          yield* Operation.invoke(Common.LayoutOperation.SwitchWorkspace, {
            subject: layout.previousWorkspace,
          });
        }),
      }),

      //
      // Open
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.Open,
        handler: Effect.fnUntraced(function* (input) {
          const layout = yield* Capability.get(SimpleLayoutState);
          layout.active = input.subject[0];
        }),
      }),

      //
      // Close
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.Close,
        handler: Effect.fnUntraced(function* () {
          const layout = yield* Capability.get(SimpleLayoutState);
          layout.active = undefined;
        }),
      }),

      //
      // Set
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.Set,
        handler: Effect.fnUntraced(function* (input) {
          const layout = yield* Capability.get(SimpleLayoutState);
          layout.active = input.subject[0];
        }),
      }),
    ]);
  }),
);
