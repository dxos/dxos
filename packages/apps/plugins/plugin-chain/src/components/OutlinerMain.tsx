//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Tree as TreeType } from '@braneframe/types';
import { TextObject, getSpaceForObject } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart, textBlockWidth, mx, inputSurface } from '@dxos/react-ui-theme';

import { Chain } from './Chain';

export const ChainMain: FC<{ tree: TreeType }> = ({ tree }) => {
  const space = getSpaceForObject(tree);
  if (!space) {
    return null;
  }

  return (
    // TODO(burdon): Factor out style (same for markdown, stack plugin).
    <Main.Content classNames={[baseSurface, topbarBlockPaddingStart]}>
      <div role='none' className={mx(textBlockWidth, inputSurface, 'pli-2')}>
        <div role='none' className={mx('plb-4 min-bs-[calc(100dvh-var(--topbar-size))] flex flex-col')}>
          <Chain.Root
            isTasklist={tree.checkbox}
            root={tree.root}
            onCreate={(text?: string) => new TreeType.Item({ text: new TextObject(text) })}
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
    <Chain.Root
      className='w-full plb-4'
      isTasklist={tree.checkbox}
      root={tree.root}
      onCreate={() => new TreeType.Item()}
      onDelete={({ id }) => {
        const item = space.db.getObjectById(id);
        item && space.db.remove(item);
      }}
    />
  );
};
