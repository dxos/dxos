//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { TreeItemType, type TreeType } from '@braneframe/types';
import { create } from '@dxos/echo-schema';
import { getSpace } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  topbarBlockPaddingStart,
  textBlockWidth,
  mx,
  surfaceElevation,
  attentionSurface,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

import { Outliner } from './Outliner';

const OutlinerMain: FC<{ tree: TreeType }> = ({ tree }) => {
  const space = getSpace(tree);
  if (!space || !tree.root) {
    return null;
  }

  return (
    // TODO(burdon): Factor out style (same for markdown, stack plugin).
    <Main.Content classNames={[baseSurface, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <div role='none' className={mx(textBlockWidth, 'pli-2')}>
        <div role='none' className={mx('plb-4 min-bs-[calc(100dvh-var(--topbar-size))] flex flex-col')}>
          <Outliner.Root
            className={mx(attentionSurface, surfaceElevation({ elevation: 'group' }), 'p-4')}
            isTasklist={tree.checkbox}
            root={tree.root}
            onCreate={(text?: string) => create(TreeItemType, { content: text ?? '', items: [] })}
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

export default OutlinerMain;
