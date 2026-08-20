//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import * as Node from '@dxos/app-graph/Node';
import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { invariant } from '@dxos/invariant';
import { useActionRunner } from '@dxos/plugin-graph/hooks';
import { useTranslation } from '@dxos/react-ui';
import { Attention } from '@dxos/react-ui-attention';
import {
  type ActionExecutor,
  type ActionGraphProps,
  createGapSeparator,
  createMenuItemGroup,
  graphActions,
} from '@dxos/react-ui-menu';
import { Position } from '@dxos/util';

import { useMobileLayout } from '#components';
import { meta } from '#meta';
import { DeckCapabilities, DeckSchema } from '#types';

import { type DeckStateHook, useDeckState } from './useDeckState';

const MAIN_MENU_GROUP_ID = 'navbar-main-menu';

export type MobileNavbarActions = {
  /** Action graph atom for the navbar. */
  actions: Atom.Atom<ActionGraphProps>;
  /** Action executor callback. */
  onAction: ActionExecutor;
};

export type MobileDrawerActions = {
  /** Action graph atom for the drawer. */
  actions: Atom.Atom<ActionGraphProps>;
  /** Action executor callback. */
  onAction: ActionExecutor;
};

type CompanionActionsConfig = {
  /** Prefix for companion action ids (e.g. `'navbar'` or `'drawer'`). */
  idPrefix: string;
  /** Highlight the companion matching this variant, when set. */
  selectedVariant?: string;
  /** Toggles the complementary sidebar's panel and open state. */
  updateState: DeckStateHook['updateState'];
};

/**
 * Creates action graph nodes and edges for companion tab actions, shared between the mobile navbar
 * and drawer.
 */
const createMobileCompanionActions = (
  graph: AppCapabilities.AppGraph['graph'],
  stateAtom: Atom.Atom<DeckSchema.StoredDeckState>,
  get: Atom.AtomContext,
  config: CompanionActionsConfig,
): Pick<ActionGraphProps, 'nodes' | 'edges'> => {
  const { idPrefix, selectedVariant, updateState } = config;

  const state = get(stateAtom);
  const deck = state.decks[state.activeDeck];
  invariant(deck, `Deck not found: ${state.activeDeck}`);
  // An atom body cannot call `useMobileStack`, so its root-panel fallback is mirrored inline here.
  const activeId =
    deck.active[deck.active.length - 1] ??
    (state.activeDeck === DeckSchema.DEFAULT_DECK_ID ? Node.RootId : state.activeDeck);

  // Keys off the active plank's own child connections rather than `deck.companionPlanks` (the desktop
  // side-by-side flag a declared-chain open in open.ts carries onto a replacement plank), so that
  // bookkeeping stays inert for the mobile companion picker.
  const companions = get(graph.connections(activeId, 'child'))
    .filter((node) => node.type === DeckSchema.PLANK_COMPANION_TYPE)
    .toSorted((a, b) => Position.compare(a.properties, b.properties));

  const nodes: ActionGraphProps['nodes'] = [];
  const edges: ActionGraphProps['edges'] = [];

  companions.forEach((companion) => {
    const companionVariant = Attention.getLinkedVariant(companion.id);
    const companionAction = {
      id: `${idPrefix}-companion-${companion.id}`,
      type: Node.ActionType,
      properties: {
        icon: companion.properties.icon ?? 'ph--circle-dashed--regular',
        label: companion.properties.label,
        iconOnly: true,
        ...(selectedVariant !== undefined && {
          variant: selectedVariant === companionVariant ? 'primary' : 'ghost',
        }),
      },
      data: () =>
        Effect.sync(() =>
          updateState((current) => {
            const closing =
              current.complementarySidebarPanel === companionVariant && current.complementarySidebarState !== 'closed';
            return {
              ...current,
              complementarySidebarPanel: closing ? undefined : companionVariant,
              complementarySidebarState: closing ? 'closed' : 'collapsed',
            };
          }),
        ),
    };
    nodes.push(companionAction);
    edges.push({ source: 'root', target: companionAction.id, relation: 'child' });
  });

  return { nodes, edges };
};

/**
 * Builds the mobile navbar actions including companion tabs, separator, and main menu dropdown.
 */
export const useMobileNavbarActions = (): MobileNavbarActions => {
  const { t } = useTranslation(meta.profile.key);
  const { graph } = useAppGraph();
  const runAction = useActionRunner();
  const stateAtom = useCapability(DeckCapabilities.State);
  const { updateState } = useDeckState();

  const actionsAtom = useMemo(
    () =>
      Atom.make((get): ActionGraphProps => {
        const { nodes, edges } = createMobileCompanionActions(graph, stateAtom, get, {
          idPrefix: 'navbar',
          updateState,
        });

        const gapSeparator = createGapSeparator('navbar-gap');
        nodes.push(...gapSeparator.nodes);
        edges.push(...gapSeparator.edges);

        const mainMenuGroup = createMenuItemGroup(MAIN_MENU_GROUP_ID, {
          variant: 'dropdownMenu',
          icon: 'ph--list--regular',
          iconOnly: true,
          label: t('main-menu.label'),
          testId: 'deckPlugin.addSpace',
        });
        nodes.push(mainMenuGroup);
        edges.push({ source: 'root', target: mainMenuGroup.id, relation: 'child' });

        // `graphActions` returns typed `ActionGraphProps` directly, so no cast is needed to bridge
        // `@dxos/app-graph`'s `Node.ActionLike[]` into `@dxos/react-ui-menu`'s node/edge shape.
        const menu = graphActions(graph, get, Node.RootId, {
          rootId: MAIN_MENU_GROUP_ID,
          filter: (action) => action.properties.disposition === 'menu',
        });
        nodes.push(...menu.nodes);
        edges.push(...menu.edges);

        return { nodes, edges };
      }),
    [graph, stateAtom, updateState, t],
  );

  return { actions: actionsAtom, onAction: runAction };
};

/**
 * Builds the mobile drawer actions including companion tabs and toolbar buttons.
 */
export const useMobileDrawerActions = (consumerName: string): MobileDrawerActions => {
  const { t } = useTranslation(meta.profile.key);
  const stateAtom = useCapability(DeckCapabilities.State);
  const { graph } = useAppGraph();
  const runAction = useActionRunner();
  const { updateState } = useDeckState();
  const { keyboardOpen } = useMobileLayout(consumerName);

  const actionsAtom = useMemo(
    () =>
      Atom.make((get): ActionGraphProps => {
        const state = get(stateAtom);

        const { nodes, edges } = createMobileCompanionActions(graph, stateAtom, get, {
          idPrefix: 'drawer',
          selectedVariant: state.complementarySidebarState !== 'closed' ? state.complementarySidebarPanel : undefined,
          updateState,
        });

        const gapSeparator = createGapSeparator('drawer-gap');
        nodes.push(...gapSeparator.nodes);
        edges.push(...gapSeparator.edges);

        // Add expand/collapse toggle button (hidden when the keyboard is open).
        if (!keyboardOpen) {
          const isExpanded = state.complementarySidebarState === 'expanded';
          const toggleExpandAction = {
            id: 'drawer-toggle-expand',
            type: Node.ActionType,
            properties: {
              icon: isExpanded ? 'ph--arrow-down--regular' : 'ph--arrow-up--regular',
              label: isExpanded ? t('collapse-drawer.label') : t('expand-drawer.label'),
              iconOnly: true,
            },
            data: () =>
              Effect.sync(() =>
                updateState((current) => ({
                  ...current,
                  complementarySidebarState: isExpanded ? 'collapsed' : 'expanded',
                })),
              ),
          };
          nodes.push(toggleExpandAction);
          edges.push({ source: 'root', target: toggleExpandAction.id, relation: 'child' });
        }

        const closeAction = {
          id: 'drawer-close',
          type: Node.ActionType,
          properties: {
            icon: 'ph--x--regular',
            label: t('close-drawer.label'),
            iconOnly: true,
          },
          data: () =>
            Effect.sync(() =>
              updateState((current) => ({
                ...current,
                complementarySidebarPanel: undefined,
                complementarySidebarState: 'closed',
              })),
            ),
        };
        nodes.push(closeAction);
        edges.push({ source: 'root', target: closeAction.id, relation: 'child' });

        return { nodes, edges };
      }),
    [graph, stateAtom, updateState, keyboardOpen, t],
  );

  return { actions: actionsAtom, onAction: runAction };
};
