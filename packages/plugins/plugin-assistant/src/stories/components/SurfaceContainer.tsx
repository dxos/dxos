//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { Array, Option } from 'effect';
import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { AiContextBinder } from '@dxos/assistant';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { Assistant } from '../../types';

import { type ComponentProps } from './types';

/**
 * Shows the surface relating to the first bound object to the curent chat.
 */
export const SurfaceContainer = ({ space, debug }: ComponentProps) => {
  const chats = useQuery(space, Filter.type(Assistant.Chat));
  const binder = useMemo(() => {
    if (!chats.length) {
      return undefined;
    }

    // Get the latest chat (is this deterministic?)
    const chat = chats[chats.length - 1];
    const binder = new AiContextBinder(chat.queue.target!);
    return binder;
  }, [chats]);

  const objects = Option.fromNullable(binder?.objects.value).pipe(
    Option.getOrElse(() => []),
    Array.map((ref) => ref.target),
    Array.filter(isNonNullable),
  );

  // TODO(burdon): Specify role hint to hide toolbar.
  return (
    <div className='flex flex-col bs-full overflow-y-auto divide-y divide-separator'>
      {objects.map((object) => (
        <div key={object.id} className='group contents'>
          {debug && (
            <div
              className={mx(
                'flex gap-2 items-center text-xs justify-center',
                'text-subdued group-first:border-none border-t border-subduedSeparator',
              )}
            >
              <span>{Obj.getTypename(object)}</span>
              <span>{object.id}</span>
            </div>
          )}
          <Surface role='section' limit={1} data={{ subject: object }} />
        </div>
      ))}
    </div>
  );
};
