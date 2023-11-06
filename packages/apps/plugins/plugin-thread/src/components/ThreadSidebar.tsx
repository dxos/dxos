//
// Copyright 2023 DXOS.org
//

import { CaretDoubleRight } from '@phosphor-icons/react';
import React, { type FC, useEffect, useState } from 'react';

import { Thread as ThreadType } from '@braneframe/types';
import { parseLayoutPlugin, useResolvePlugin } from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import { Button, Tooltip, useSidebars, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { ThreadContainer } from './ThreadContainer';
import { THREAD_PLUGIN } from '../meta';

export const ThreadSidebar: FC<{ space?: Space; thread?: ThreadType }> = ({ space, thread: initialThread }) => {
  const { closeComplementarySidebar, complementarySidebarOpen } = useSidebars(THREAD_PLUGIN);
  const { t } = useTranslation('os');

  // TODO(burdon): Get current context.
  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  // console.log('layout:', layoutPlugin?.provides.layout.active);

  const [thread, setThread] = useState(initialThread);
  // const spacePlugin = usePlugin<SpacePluginProvides>(SPACE_PLUGIN);
  // const space = thread && spacePlugin?.provides.space;
  useEffect(() => {
    if (space) {
      // TODO(burdon): Get thread appropriate for context.
      const { objects: threads } = space.db.query(ThreadType.filter());
      if (threads.length) {
        setThread(threads[0] as ThreadType);
      }
    }
  }, [space, thread]);

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

      <ThreadContainer space={space} thread={thread} activeObjectId={layoutPlugin?.provides.layout.active} />
    </div>
  );
};
