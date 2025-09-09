//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useSignalsMemo } from '@dxos/react-ui';
import { Stack, StackItem } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { useContextBinder } from '../../hooks';
import { Assistant } from '../../types';

import { type ComponentProps } from './types';

const panelClassNames = 'bg-baseSurface rounded border border-separator overflow-hidden';

/**
 * Shows the surface relating to the first bound object to the curent chat.
 */
export const SurfaceContainer = ({ space, debug }: ComponentProps) => {
  const chats = useQuery(space, Filter.type(Assistant.Chat));
  const binder = useContextBinder(chats.at(-1));
  const objects = useSignalsMemo(
    () => binder?.objects.value.map((ref) => ref.target).filter(isNonNullable) ?? [],
    [binder],
  );

  return (
    <Stack
      orientation='vertical'
      size='contain'
      rail={false}
      itemsCount={objects.length}
      classNames='gap-[--stack-gap]'
    >
      {objects.map((object, i) => (
        <StackItem.Root key={i} order={i + 1} item={{ id: `${i}` }} classNames={panelClassNames}>
          <StackItem.Content>
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
          </StackItem.Content>
        </StackItem.Root>
      ))}
    </Stack>
  );
};
