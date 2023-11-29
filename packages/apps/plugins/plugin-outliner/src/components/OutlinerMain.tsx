//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Tree as TreeType } from '@braneframe/types';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart, textBlockWidth, mx, inputSurface } from '@dxos/react-ui-theme';

import { Outliner } from './Outliner';

export const OutlinerMain: FC<{ tree: TreeType }> = ({ tree }) => {
  const space = getSpaceForObject(tree);
  if (!space) {
    return null;
  }

  return (
    // TODO(burdon): Factor out style (same for markdown, stack plugin).
    <Main.Content classNames={[baseSurface, topbarBlockPaddingStart]}>
      <div role='none' className={mx(textBlockWidth, inputSurface, 'pli-2')}>
        <div role='none' className={mx('plb-6 min-bs-[calc(100dvh-var(--topbar-size))] flex flex-col')}>
          <Outliner.Root
            isTasklist={tree.checkbox}
            root={tree.root}
            onCreate={() => new TreeType.Item()}
            onDelete={({ id }) => {
              const item = space.db.getObjectById(id);
              item && space.db.remove(item);
            }}
          />
        </div>
      </div>
    </Main.Content>
  );
};

export const TreeSection: FC<{ tree: TreeType }> = ({ tree }) => {
  const space = getSpaceForObject(tree);
  if (!space) {
    return null;
  }

  return (
    <div role='none' className='flex flex-col w-full plb-6'>
      <Outliner.Root
        isTasklist={tree.checkbox}
        root={tree.root}
        onCreate={() => new TreeType.Item()}
        onDelete={({ id }) => {
          const item = space.db.getObjectById(id);
          item && space.db.remove(item);
        }}
      />
    </div>
  );
};
