//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as GraphHooks from '@dxos/plugin-graph/Hooks';
import {
  type ActionExecutor,
  type ActionGraphProps,
  ActionToolbar,
  MenuBuilder,
  graphActions,
  isToolbarAction,
  useMenuBuilder,
} from '@dxos/react-ui-menu';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { meta } from '#meta';
import { SpaceSurface } from '#types';

export type SpaceHomeArticleProps = AppSurface.SpaceArticleProps;

/**
 * Per-space Home article shell. Owns only the chrome: a toolbar sourced from graph actions
 * contributed with `disposition: 'toolbar'` (e.g. Start / Hide Welcome from plugin-support),
 * and a Container layout that delegates its body to surface contributors:
 *
 * - `space-home-content`: scrollable region (Welcome panel, recent-objects masonry, starter prompts).
 * - `space-home-pin-bottom`: pinned region (assistant prompt), capped at one contributor.
 *
 * The Space is read from `data.subject` (the Home node carries the Space as its data).
 */
export const SpaceHomeArticle = ({ role, attendableId, space }: SpaceHomeArticleProps) => {
  const { actions, onAction } = useMenuActions(attendableId);
  const layout = Hooks.useLayout();
  // The card-scale gutter is a fifth of a phone viewport; mobile steps down to the dialog scale.
  const gutter = layout.mode === 'mobile' ? 'md' : 'lg';

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <ActionToolbar {...actions} attendableId={attendableId} onAction={onAction} />
      </Panel.Header>

      <Panel.Body asChild>
        <Layout.Container gutter={gutter} style={{ gridTemplateRows: 'minmax(0,1fr) auto' }}>
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport>
              <Layout.Flex column gap='lg' classNames='dx-document pb-trim-2xl'>
                <Surface.Surface type={SpaceSurface.SpaceHomeContent} data={{ space }} />
              </Layout.Flex>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
          <div className='dx-document pb-4'>
            <Surface.Surface type={SpaceSurface.SpaceHomePinBottom} data={{ space }} limit={1} />
          </div>
        </Layout.Container>
      </Panel.Body>
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
  const { graph } = Hooks.useAppGraph();
  const runAction = GraphHooks.useActionRunner();

  const menuActions = useMenuBuilder(
    (get): ActionGraphProps => {
      if (!attendableId) {
        return MenuBuilder.make().build();
      }
      return MenuBuilder.make()
        .subgraph(graphActions(graph, get, attendableId, { filter: isToolbarAction }))
        .build();
    },
    [graph, attendableId],
  );

  const onAction: ActionExecutor = useCallback(
    (action) => {
      void runAction(action, { caller: meta.profile.key });
    },
    [runAction],
  );

  return { actions: menuActions, onAction };
};

SpaceHomeArticle.displayName = 'SpaceHomeArticle';
