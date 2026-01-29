//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { OperationResolver } from '@dxos/operation';

import { LayoutState, type LayoutStateProps } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Common.Capability.AtomRegistry);
    const stateAtom = yield* Capability.get(LayoutState);

    const updateState = (fn: (state: LayoutStateProps) => Partial<LayoutStateProps>) => {
      const current = registry.get(stateAtom);
      registry.set(stateAtom, { ...current, ...fn(current) });
    };

    return Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateSidebar,
        handler: Effect.fnUntraced(function* ({ state }) {
          updateState((layout) => {
            const next = state ?? layout.sidebarState;
            if (next !== layout.sidebarState) {
              return { sidebarState: next };
            }
            return {};
          });
        }),
      }),
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateComplementary,
        handler: Effect.fnUntraced(function* ({ state }) {
          updateState((layout) => {
            const next = state ?? layout.complementarySidebarState;
            if (next !== layout.complementarySidebarState) {
              return { complementarySidebarState: next };
            }
            return {};
          });
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
          updateState(() => ({
            dialogOpen: state ?? Boolean(subject),
            dialogType: type ?? 'default',
            dialogBlockAlign: blockAlign ?? 'center',
            dialogOverlayClasses: overlayClasses,
            dialogOverlayStyle: overlayStyle,
            dialogContent: subject ? { component: subject, props } : null,
          }));
        }),
      }),
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdatePopover,
        handler: Effect.fnUntraced(function* (input) {
          const { subject, state, side, props } = input;
          updateState(() => {
            const base: Partial<LayoutStateProps> = {
              popoverContent:
                typeof subject === 'string' ? { component: subject, props } : subject ? { subject } : undefined,
              popoverOpen: state ?? Boolean(subject),
              popoverSide: side,
            };
            if ('variant' in input && input.variant === 'virtual') {
              return { ...base, popoverVariant: 'virtual', popoverAnchor: input.anchor };
            } else if ('anchorId' in input) {
              return { ...base, popoverVariant: 'react', popoverAnchorId: input.anchorId };
            }
            return base;
          });
        }),
      }),
      OperationResolver.make({
        operation: Common.LayoutOperation.SwitchWorkspace,
        handler: Effect.fnUntraced(function* ({ subject }) {
          updateState(() => ({ workspace: subject }));
        }),
      }),
    ]);
  }),
);
