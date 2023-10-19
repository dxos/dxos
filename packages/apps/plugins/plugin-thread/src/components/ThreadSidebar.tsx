//
// Copyright 2023 DXOS.org
//

import { CaretDoubleRight } from '@phosphor-icons/react';
import React, { type FC, useEffect, useState } from 'react';

import { type SpacePluginProvides } from '@braneframe/plugin-space';
import { type SplitViewPluginProvides } from '@braneframe/plugin-splitview';
import { Thread as ThreadType } from '@braneframe/types';
import { findPlugin, usePlugins } from '@dxos/react-surface';
import { Button, Tooltip, useSidebars, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { ThreadContainer } from './ThreadContainer';
import { THREAD_PLUGIN } from '../types';

export const ThreadSidebar: FC<{ data: ThreadType }> = ({ data: object }) => {
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const { closeComplementarySidebar, complementarySidebarOpen } = useSidebars(THREAD_PLUGIN);
  const { t } = useTranslation('os');
  const space = spacePlugin?.provides.space.active;
  const [thread, setThread] = useState<ThreadType | null>(object);
  useEffect(() => {
    if (space) {
      // TODO(burdon): Get thread appropriate for context.
      const { objects: threads } = space.db.query(ThreadType.filter());
      if (threads.length) {
        setThread(threads[0] as ThreadType);
      }
    }
  }, [space, object]);

  // TODO(burdon): Get current context.
  const splitviewPlugin = findPlugin<SplitViewPluginProvides>(plugins, 'dxos.org/plugin/splitview');
  // console.log('splitView:', splitviewPlugin?.provides?.splitView?.active);

  if (!space || !thread) {
    return null;
  }

  return (
    <div role='none' className='flex flex-col align-start is-full bs-full'>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button
            variant='ghost'
            classNames='shrink-0 is-10 lg:hidden pli-2 pointer-fine:pli-1'
            {...(!complementarySidebarOpen && { tabIndex: -1 })}
            onClick={closeComplementarySidebar}
          >
            <span className='sr-only'>{t('close sidebar label')}</span>
            <CaretDoubleRight className={getSize(4)} />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content classNames='z-[70]'>
            {t('close sidebar label', { ns: 'os' })}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      <ThreadContainer space={space} thread={thread} activeObjectId={splitviewPlugin?.provides?.splitView?.active} />
    </div>
  );
};
