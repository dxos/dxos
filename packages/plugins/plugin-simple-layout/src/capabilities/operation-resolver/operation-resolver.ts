//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Operation, OperationResolver } from '@dxos/operation';

import { type SimpleLayoutState, SimpleLayoutState as SimpleLayoutStateCapability } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Common.Capability.AtomRegistry);
    const stateAtom = yield* Capability.get(SimpleLayoutStateCapability);

    const getState = () => registry.get(stateAtom);
    const updateState = (fn: (current: SimpleLayoutState) => SimpleLayoutState) => {
      registry.set(stateAtom, fn(getState()));
    };

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
          updateState((state) => ({
            ...state,
            dialogOpen: input.state ?? Boolean(input.subject),
            dialogType: input.type ?? 'default',
            dialogBlockAlign: input.blockAlign ?? 'center',
            dialogOverlayClasses: input.overlayClasses,
            dialogOverlayStyle: input.overlayStyle,
            dialogContent: input.subject ? { component: input.subject, props: input.props } : undefined,
          }));
        }),
      }),

      //
      // UpdatePopover
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdatePopover,
        handler: Effect.fnUntraced(function* (input) {
          updateState((state) => ({
            ...state,
            popoverOpen: input.state ?? Boolean(input.subject),
            popoverKind: input.kind ?? 'base',
            popoverTitle: input.kind === 'card' ? input.title : undefined,
            popoverContent:
              typeof input.subject === 'string'
                ? { component: input.subject, props: input.props }
                : input.subject
                  ? { subject: input.subject }
                  : undefined,
            popoverSide: input.side,
            popoverVariant: input.variant,
            popoverAnchor: input.variant === 'virtual' ? input.anchor : state.popoverAnchor,
            popoverAnchorId: input.variant !== 'virtual' ? input.anchorId : state.popoverAnchorId,
          }));
        }),
      }),

      //
      // SwitchWorkspace
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.SwitchWorkspace,
        handler: Effect.fnUntraced(function* (input) {
          updateState((state) => ({
            ...state,
            // TODO(wittjosiah): This is a hack to prevent the previous deck from being set for pinned items.
            //  Ideally this should be worked into the data model in a generic way.
            previousWorkspace: !state.workspace.startsWith('!') ? state.workspace : state.previousWorkspace,
            workspace: input.subject,
            active: undefined,
          }));
        }),
      }),

      //
      // RevertWorkspace
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.RevertWorkspace,
        handler: Effect.fnUntraced(function* () {
          const state = getState();
          yield* Operation.invoke(Common.LayoutOperation.SwitchWorkspace, {
            subject: state.previousWorkspace,
          });
        }),
      }),

      //
      // Open
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.Open,
        handler: Effect.fnUntraced(function* (input) {
          updateState((state) => ({
            ...state,
            active: input.subject[0],
          }));
        }),
      }),

      //
      // Close
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.Close,
        handler: Effect.fnUntraced(function* () {
          updateState((state) => ({
            ...state,
            active: undefined,
          }));
        }),
      }),

      //
      // Set
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.Set,
        handler: Effect.fnUntraced(function* (input) {
          updateState((state) => ({
            ...state,
            active: input.subject[0],
          }));
        }),
      }),
    ]);
  }),
);
