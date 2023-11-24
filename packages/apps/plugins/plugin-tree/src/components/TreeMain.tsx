//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Tree as TreeType } from '@braneframe/types';
import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart, textBlockWidth, mx, inputSurface } from '@dxos/react-ui-theme';

import { Tree } from './Tree';

export const TreeMain: FC<{ tree: TreeType }> = ({ tree }) => {
  return (
    // TODO(burdon): Style like document.
    <Main.Content classNames={[baseSurface, topbarBlockPaddingStart]}>
      <div role='none' className={mx(textBlockWidth, inputSurface, 'pli-2')}>
        <div role='none' className={mx('pbs-4 pbe-4', 'min-bs-[calc(100dvh-var(--topbar-size))] flex flex-col')}>
          <Tree.Root checkbox={tree.checkbox} root={tree.root} onCreate={() => new TreeType()} />
        </div>
      </div>
    </Main.Content>
  );
};

export const TreeSection: FC<{ tree: TreeType }> = ({ tree }) => {
  return (
    <div role='none' className='flex flex-col w-full pbs-4 pbe-4'>
      <Tree.Root checkbox={tree.checkbox} root={tree.root} onCreate={() => new TreeType()} />
    </div>
  );
};
