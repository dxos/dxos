//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface, useAppGraph } from '@dxos/app-framework/react';
import { log } from '@dxos/log';
import { useNode } from '@dxos/plugin-graph';
import { Main as NaturalMain, Toolbar, useDynamicDrawer, useSidebars } from '@dxos/react-ui';
import { useTranslation } from '@dxos/react-ui';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/ui-theme';

import { useSimpleLayoutState } from '../../hooks';
import { meta } from '../../meta';
import { ContentError } from '../ContentError';
import { ContentLoading } from '../ContentLoading';
import { useLoadDescendents } from '../hooks';

import { Banner } from './Banner';
import { NavBar } from './NavBar';

const MAIN_NAME = 'SimpleLayout.Main';

/**
 * Main root component.
 */
export const Main = () => {
  return (
    <Mosaic.Root>
      <NaturalMain.Root>
        <Inner />
      </NaturalMain.Root>
    </Mosaic.Root>
  );
};

Main.displayName = MAIN_NAME;

const Inner = () => {
  const { t } = useTranslation(meta.id);
  const { state } = useSimpleLayoutState();
  const id = state.active ?? state.workspace;
  const { graph } = useAppGraph();
  const node = useNode(graph, id);

  const { id: parentId, variant } = parseEntryId(id);
  // Ensures that children are loaded so that they are available to navigate to.
  useLoadDescendents(id);

  const placeholder = useMemo(() => <ContentLoading />, []);

  const parentNode = useNode(graph, variant ? parentId : undefined);
  const data = useMemo(() => {
    return (
      node && {
        attendableId: id,
        subject: node.data,
        companionTo: parentNode?.data,
        properties: node.properties,
        popoverAnchorId: state.popoverAnchorId,
        variant,
      }
    );
  }, [id, node, node?.data, node?.properties, parentNode?.data, state.popoverAnchorId, variant]);

  const handleActiveIdChange = useCallback((nextActiveId: string | null) => {
    log.info('navigate', { nextActiveId });
  }, []);

  const { closeDrawer } = useSidebars(MAIN_NAME);
  const drawersState = useDynamicDrawer(MAIN_NAME);
  const showNavBar = !state.isPopover && drawersState === 'closed';

  return (
    <>
      <NaturalMain.Content
        bounce
        classNames={mx(
          'grid bs-full',
          '!overflow-hidden', // TODO(burdon): Reconcile?
          'pbs-[env(safe-area-inset-top)] pbe-[env(safe-area-inset-bottom)]',
          showNavBar ? 'grid-rows-[min-content_1fr_min-content]' : 'grid-rows-[min-content_1fr]',
        )}
      >
        <Banner classNames='border-be border-separator' node={node} />
        <article className='bs-full overflow-hidden'>
          <Surface key={id} role='article' data={data} limit={1} fallback={ContentError} placeholder={placeholder} />
        </article>
        {showNavBar && (
          <NavBar classNames='border-bs border-separator' activeId={id} onActiveIdChange={handleActiveIdChange} />
        )}
      </NaturalMain.Content>

      {/* TODO(burdon): Show companion here. */}
      <NaturalMain.Drawer label={t('drawer label')}>
        {/* TODO(burdon): Generic way to close dialog? */}
        <Toolbar.Root>
          <Toolbar.Separator variant='gap' />
          <Toolbar.IconButton
            icon='ph--x--regular'
            iconOnly
            label={t('close drawer label')}
            onClick={() => closeDrawer()}
          />
        </Toolbar.Root>
        <Surface role='article' limit={1} fallback={ContentError} placeholder={placeholder} />
      </NaturalMain.Drawer>
    </>
  );
};

// TODO(wittjosiah): Factor out. Copied from deck plugin.
const parseEntryId = (entryId: string) => {
  const [id, variant] = entryId.split(ATTENDABLE_PATH_SEPARATOR);
  return { id, variant };
};
