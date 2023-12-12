//
// Copyright 2023 DXOS.org
//

import { CaretDoubleRight } from '@phosphor-icons/react';
import React, { type FC, useEffect, useState } from 'react';

import { Thread as ThreadType } from '@braneframe/types';
import { parseLayoutPlugin, useResolvePlugin } from '@dxos/app-framework';
import { type Space, isTypedObject } from '@dxos/react-client/echo';
import { Button, Tooltip, useSidebars, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { ThreadContainer } from './ThreadContainer';
import { THREAD_PLUGIN } from '../meta';

export const ThreadSidebar: FC<{ space?: Space }> = ({ space }) => {
  const { closeComplementarySidebar, complementarySidebarOpen } = useSidebars(THREAD_PLUGIN);
  const { t } = useTranslation('os');

  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  const [thread, setThread] = useState<ThreadType>();
  useEffect(() => {
    if (space) {
      if (layoutPlugin?.provides.layout.active) {
        const active = space.db.getObjectById(layoutPlugin?.provides.layout.active);
        if (isTypedObject(active) && active.__typename === ThreadType.schema.typename) {
          setThread(undefined);
          return;
        }
      }

      // TODO(burdon): Get thread appropriate for context.
      const { objects: threads } = space.db.query(ThreadType.filter());
      if (threads.length) {
        setThread(threads[0]);
        return;
      }
    }

    setThread(undefined);
  }, [space, layoutPlugin?.provides.layout.active]);

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

      <ThreadContainer
        space={space}
        thread={thread}
        activeObjectId={layoutPlugin?.provides.layout.active}
        fullWidth={true}
      />
    </div>
  );
};
