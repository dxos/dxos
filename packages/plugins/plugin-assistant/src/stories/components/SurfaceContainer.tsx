//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useSignalsMemo } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { isNonNullable } from '@dxos/util';

import { useContextBinder } from '../../hooks';
import { Assistant } from '../../types';

import { type ComponentProps } from './types';

const panelClassNames = 'bg-baseSurface rounded border border-separator overflow-hidden';

/**
 * Shows the surface relating to the first bound object to the curent chat.
 */
export const SurfaceContainer = ({ space, debug, indexOffset: j }: ComponentProps & { indexOffset: number }) => {
  const chats = useQuery(space, Filter.type(Assistant.Chat));
  const binder = useContextBinder(chats.at(-1));
  const objects = useSignalsMemo(
    () => binder?.objects.value.map((ref) => ref.target).filter(isNonNullable) ?? [],
    [binder],
  );

  return (
    <>
      {objects.map((object, i) => {
        const k = j + i;
        return (
          <StackItem.Root key={k} order={k + 1} item={{ id: `${k}` }} classNames={panelClassNames}>
            {debug && (
              <div role='heading' className='flex gap-2 items-center text-xs justify-center text-subdued'>
                <span>{Obj.getTypename(object)}</span>
                <span>{object.id}</span>
              </div>
            )}
            <Surface role='section' limit={1} data={{ subject: object }} />
          </StackItem.Root>
        );
      })}
    </>
  );
};
