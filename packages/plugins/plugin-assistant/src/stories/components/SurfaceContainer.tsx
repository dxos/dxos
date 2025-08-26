//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { useSignalsMemo } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { useContextBinder } from '../../hooks';

import { type ComponentProps } from './types';

/**
 * Shows the surface relating to the first bound object to the curent chat.
 */
export const SurfaceContainer = ({ space, debug }: ComponentProps) => {
  const binder = useContextBinder(space);
  const objects = useSignalsMemo(
    () => binder?.objects.value.map((ref) => ref.target).filter(isNonNullable) ?? [],
    [binder],
  );

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
