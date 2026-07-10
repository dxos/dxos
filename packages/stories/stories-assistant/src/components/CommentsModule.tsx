//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { Assistant } from '@dxos/plugin-assistant';
import { useContextBinder } from '@dxos/plugin-assistant/hooks';
import { type Space, useQuery } from '@dxos/react-client/echo';

export const CommentsModule = ({ space }: { space: Space }) => {
  const chats = useQuery(space.db, Filter.type(Assistant.Chat));
  const feedTarget = chats.at(-1)?.feed.target;
  const context = useContextBinder(space, feedTarget);
  const object = context?.getObjects()[0];
  const data = useMemo(() => ({ attendableId: 'story', subject: 'comments', companionTo: object }), [object]);
  if (!object) {
    return null;
  }

  return <Surface.Surface type={AppSurface.Article} data={data} />;
};
