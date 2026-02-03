//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Operation, OperationResolver } from '@dxos/operation';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';

import { type SimpleLayoutState, SimpleLayoutState as SimpleLayoutStateCapability } from '../../types';

/** Maximum number of items to keep in navigation history. */
const MAX_HISTORY_LENGTH = 50;

/** Parse entry ID to extract primary ID and variant. */
const parseEntryId = (entryId: string) => {
  const [id, variant] = entryId.split(ATTENDABLE_PATH_SEPARATOR);
  return { id, variant };
};

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
      // UpdateComplementary - Controls companion drawer.
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateComplementary,
        handler: Effect.fnUntraced(function* (input) {
          if (input.state === 'closed') {
            updateState((state) => ({
              ...state,
              drawerState: 'closed',
            }));
          }
        }),
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
            // Clear history when switching workspaces.
            history: [],
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
          const id = input.subject[0];
          const { variant } = parseEntryId(id);

          if (variant) {
            // It's a companion - store the variant preference and open drawer.
            updateState((state) => ({
              ...state,
              companionVariant: variant,
              // Open drawer if closed, otherwise preserve current state (expanded/full).
              drawerState: state.drawerState === 'closed' || !state.drawerState ? 'expanded' : state.drawerState,
            }));
          } else {
            // Regular navigation - update active and history.
            updateState((state) => {
              // Push current active to history if it exists.
              const newHistory = state.active ? [...state.history, state.active] : state.history;
              // Limit history length to prevent memory issues.
              const trimmedHistory =
                newHistory.length > MAX_HISTORY_LENGTH ? newHistory.slice(-MAX_HISTORY_LENGTH) : newHistory;
              return {
                ...state,
                active: id,
                history: trimmedHistory,
              };
            });
          }
        }),
      }),

      //
      // Close
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.Close,
        handler: Effect.fnUntraced(function* () {
          updateState((state) => {
            // Pop from history if available.
            if (state.history.length > 0) {
              const newHistory = [...state.history];
              const previousActive = newHistory.pop();
              return {
                ...state,
                active: previousActive,
                history: newHistory,
              };
            }
            // No history, just clear active.
            return {
              ...state,
              active: undefined,
            };
          });
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
