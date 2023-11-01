//
// Copyright 2023 DXOS.org
//

import { CaretDoubleRight } from '@phosphor-icons/react';
import React, { type FC, useEffect, useState } from 'react';

import { Thread as ThreadType } from '@braneframe/types';
import { parseLayoutPlugin, resolvePlugin, usePlugins } from '@dxos/app-framework';
import { getSpaceForObject } from '@dxos/client/echo';
import { Button, Tooltip, useSidebars, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { ThreadContainer } from './ThreadContainer';
import { THREAD_PLUGIN } from '../types';

export const ThreadSidebar: FC<{ thread?: ThreadType }> = ({ thread: initialThread }) => {
  const { t } = useTranslation('os');
  const { closeComplementarySidebar, complementarySidebarOpen } = useSidebars(THREAD_PLUGIN);
  const [thread, setThread] = useState(initialThread);
  const space = thread && getSpaceForObject(thread);
  useEffect(() => {
    if (space) {
      // TODO(burdon): Get thread appropriate for context.
      const { objects: threads } = space.db.query(ThreadType.filter());
      if (threads.length) {
        setThread(threads[0] as ThreadType);
      }
    }
  }, [space, thread]);

  // TODO(burdon): Get current context.
  const { plugins } = usePlugins();
  const layoutPlugin = resolvePlugin(plugins, parseLayoutPlugin);
  // console.log('layout:', layoutPlugin?.provides.layout.active);

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
