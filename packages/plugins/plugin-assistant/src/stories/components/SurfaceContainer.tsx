//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { Filter, Obj, type Type } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { ContextBinder } from '@dxos/assistant';
import { useAsyncState } from '@dxos/react-ui';

import { Assistant } from '../../types';
import { type ComponentProps } from './types';

/**
 * Shows the surface relating to the first bound object to the curent chat.
 */
export const SurfaceContainer = ({ space }: ComponentProps) => {
  const chats = useQuery(space, Filter.type(Assistant.Chat));
  const [object] = useAsyncState<Type.Expando | null>(async () => {
    if (!chats.length) {
      return null;
    }

    // Get the latest chat (is this deterministic?)
    const chat = chats[chats.length - 1]!;
    const binder = new ContextBinder(chat.queue.target!);
    const ref = binder.objects.value?.[0];
    const object = await ref?.load();
    // TODO(burdon): Auto log meta for ECHO objects?
    log.info('loaded', { typename: Obj.getTypename(object), id: object?.id });
    return object;
  }, [chats]);

  return <Surface role='article' limit={1} data={{ subject: object }} />;
};
