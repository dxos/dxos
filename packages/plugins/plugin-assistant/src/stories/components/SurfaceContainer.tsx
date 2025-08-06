//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { AiContextBinder } from '@dxos/assistant';
import { Filter, Obj, Ref, type Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { useAsyncState } from '@dxos/react-ui';

import { Assistant } from '../../types';

import { type ComponentProps } from './types';

/**
 * Shows the surface relating to the first bound object to the curent chat.
 */
export const SurfaceContainer = ({ space }: ComponentProps) => {
  const chats = useQuery(space, Filter.type(Assistant.Chat));
  const [objects] = useAsyncState<Type.Expando[]>(async () => {
    if (!chats.length) {
      return [];
    }

    // Get the latest chat (is this deterministic?)
    const chat = chats[chats.length - 1];
    const binder = new AiContextBinder(chat.queue.target!);
    const refs = binder.objects.value;
    const objects = await Ref.Array.loadAll(refs);
    // TODO(burdon): Auto log meta for ECHO objects?
    log('loaded', { objects: objects.map((obj) => ({ typename: Obj.getTypename(obj), id: obj.id })) });
    return objects;
  }, [chats]);

  // TODO(burdon): Specify role hint to hide toolbar.
  return (
    <div className='flex flex-col bs-full overflow-y-auto divide-y divide-separator'>
      {objects?.map((object) => (
        <Surface key={object.id} role='section' limit={1} data={{ subject: object }} />
      ))}
    </div>
  );
};
