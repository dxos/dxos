//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { type AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { useActionRunner } from '@dxos/plugin-graph';
import { Column, Panel, ScrollArea } from '@dxos/react-ui';
import {
  type ActionExecutor,
  type ActionGraphProps,
  Menu,
  MenuBuilder,
  graphActions,
  useMenuBuilder,
} from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { SpaceHomeContent, SpaceHomePinBottom } from '#types';

export type SpaceHomeArticleProps = AppSurface.SpaceArticleProps;

/**
 * Per-space Home article shell. Owns only the chrome: a toolbar sourced from graph actions
 * contributed with `disposition: 'toolbar'` (e.g. Start tour / Hide Welcome from plugin-support),
 * and a Column layout that delegates its body to surface contributors:
 *
 * - `space-home-content`: scrollable region (Welcome panel, recent-objects masonry, starter prompts).
 * - `space-home-pin-bottom`: pinned region (assistant prompt), capped at one contributor.
 *
 * The Space is read from `data.subject` (the Home node carries the Space as its data).
 */
export const SpaceHomeArticle = ({ role, attendableId, space }: SpaceHomeArticleProps) => {
  const { actions, onAction } = useMenuActions(attendableId);

  return (
    <Panel.Root role={role}>
      <Menu.Root {...actions} attendableId={attendableId} onAction={onAction}>
        <Panel.Toolbar asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
      </Menu.Root>
      <Panel.Content asChild>
        <Column.Root style={{ gridTemplateRows: 'minmax(0,1fr) auto' }}>
          <ScrollArea.Root orientation='vertical' centered padding>
            <ScrollArea.Viewport>
              <div className='dx-document flex flex-col gap-4 py-4'>
                <Surface.Surface type={SpaceHomeContent} data={{ space }} />
              </div>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
          <Column.Center classNames='dx-document pb-4'>
            <Surface.Surface type={SpaceHomePinBottom} data={{ space }} limit={1} />
          </Column.Center>
        </Column.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

//
// Hooks
//

/**
 * Builds the toolbar from contributed graph actions for the Home node. Actions opt into the
 * toolbar via `disposition: 'toolbar'`; the Home shell contributes none itself, so the toolbar
 * is empty unless another plugin (e.g. plugin-support's tour/welcome actions) contributes.
 */
const useMenuActions = (
  attendableId?: string,
): { actions: ReturnType<typeof useMenuBuilder>; onAction: ActionExecutor } => {
  const { graph } = useAppGraph();
  const runAction = useActionRunner();

  const menuActions = useMenuBuilder(
    (get): ActionGraphProps => {
      if (!attendableId) {
        return MenuBuilder.make().build();
      }
      return MenuBuilder.make()
        .subgraph(
          graphActions(graph, get, attendableId, { filter: (action) => action.properties.disposition === 'toolbar' }),
        )
        .build();
    },
    [graph, attendableId],
  );

  const onAction: ActionExecutor = useCallback(
    (action) => {
      void runAction(action, { caller: meta.id });
    },
    [runAction],
  );

  return { actions: menuActions, onAction };
};
