//
// Copyright 2025 DXOS.org
//

// Article surface component — the main content view for ExemplarItem objects.
// `Panel.Root` and `Panel.Content` provide the standard article layout with
// consistent padding, scrolling, and responsive behavior.
// The `role` prop is forwarded to Panel.Root so the layout system can adapt
// (e.g., articles vs sections have different chrome).

import { Atom } from '@effect-atom/atom-react';
import React, { useCallback, useMemo } from 'react';

import { type AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { type Node, useActionRunner } from '@dxos/plugin-graph';
import { useObject } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { type ActionExecutor, type ActionGraphProps, Menu, MenuBuilder, useMenuActions } from '@dxos/react-ui-menu';

import { ExemplarItemView } from '#components';
import { meta } from '#meta';
import type { ExemplarItem } from '#types';

export type ExemplarArticleProps = AppSurface.ObjectArticleProps<ExemplarItem.ExemplarItem>;

// Container components connect ECHO objects to presentational components.
// `useObject` subscribes to reactive updates on the ECHO object so the component
// re-renders when any property changes (locally or from remote peers).
export const ExemplarArticle = ({ role, subject, attendableId }: ExemplarArticleProps) => {
  // `useObject` subscribes to the ECHO object and returns a new snapshot whenever it changes.
  // Reading from the snapshot ensures values do not change in the middle of a render cycle.
  const [snapshot] = useObject(subject);
  const { actions, onAction } = useToolbarActions(attendableId);

  // `onValuesChanged` receives partial updates from the form.
  // `Obj.change` provides a mutable draft for safe property assignment.
  // ECHO objects are reactive proxies — changes replicate to other peers.
  const handleValuesChanged = useCallback(
    (values: Partial<{ name: string; description: string; status: 'active' | 'archived' | 'draft' }>) => {
      Obj.change(subject, (draft) => {
        if (values.name !== undefined) {
          draft.name = values.name;
        }
        if (values.description !== undefined) {
          draft.description = values.description;
        }
        if (values.status !== undefined) {
          draft.status = values.status;
        }
      });
    },
    [subject],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar>
        <Menu.Root {...actions} attendableId={attendableId} onAction={onAction}>
          <Menu.Toolbar />
        </Menu.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <ExemplarItemView
          name={snapshot.name}
          description={snapshot.description}
          status={snapshot.status}
          onValuesChanged={handleValuesChanged}
        />
      </Panel.Content>
    </Panel.Root>
  );
};

export default ExemplarArticle;

//
// Hooks
//

/**
 * Builds toolbar menu actions from the app graph for the given node.
 * Filters to `disposition: 'toolbar'` actions and uses `MenuBuilder` to compose them.
 * `useMenuActions` converts the atom into props for `Menu.Root`.
 * `useActionRunner` executes graph actions when triggered.
 */
const useToolbarActions = (
  attendableId: string,
): { actions: ReturnType<typeof useMenuActions>; onAction: ActionExecutor } => {
  const { graph } = useAppGraph();
  const runAction = useActionRunner();

  const actionsAtom = useMemo(
    () =>
      Atom.make((get): ActionGraphProps => {
        const actions = get(graph.actions(attendableId));
        const toolbarActions = actions.filter((action) => action.properties.disposition === 'toolbar');
        return MenuBuilder.make()
          .subgraph({
            nodes: toolbarActions as ActionGraphProps['nodes'],
            edges: toolbarActions.map((node) => ({ source: 'root', target: node.id, relation: 'child' })),
          })
          .build();
      }),
    [graph, attendableId],
  );

  const menuActions = useMenuActions(actionsAtom);

  const onAction: ActionExecutor = useCallback(
    (action) => {
      void runAction(action as Node.Action, { caller: meta.id });
    },
    [runAction],
  );

  return { actions: menuActions, onAction };
};
