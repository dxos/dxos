//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect, useState } from 'react';

import { Thread as ThreadType } from '@braneframe/types';
import { parseLayoutPlugin, useResolvePlugin } from '@dxos/app-framework';
import { type Space, isTypedObject } from '@dxos/react-client/echo';

import { ThreadContainer } from './ThreadContainer';

export const ThreadSidebar: FC<{ space?: Space }> = ({ space }) => {
  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  const [thread, setThread] = useState<ThreadType>();
  useEffect(() => {
    if (space) {
      // Don's show if the main layout is displaying the active thread.
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
    <ThreadContainer
      space={space}
      thread={thread}
      activeObjectId={layoutPlugin?.provides.layout.active}
      fullWidth={true}
    />
  );
};
