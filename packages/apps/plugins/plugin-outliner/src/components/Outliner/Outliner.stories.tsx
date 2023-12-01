//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { deepSignal, type RevertDeepSignal } from 'deepsignal';
import React, { useState } from 'react';

import { TextObject } from '@dxos/client/echo';
import { PublicKey } from '@dxos/keys';
import { DensityProvider } from '@dxos/react-ui';
import { inputSurface } from '@dxos/react-ui-theme';

import { Outliner, type OutlinerRootProps } from './Outliner';
import { type Item } from './types';

(globalThis as any)[TextObject.name] = TextObject;

const Story = ({ isTasklist }: Pick<OutlinerRootProps, 'isTasklist'>) => {
  const [root] = useState<Item>(
    deepSignal<Item>({
      id: 'root',
      items: [
        {
          id: PublicKey.random().toHex(),
          text: new TextObject('Item 1'),
        },
        {
          id: PublicKey.random().toHex(),
          text: new TextObject('Item 2'),
        },
        {
          id: PublicKey.random().toHex(),
          text: new TextObject('Item 3'),
        },
      ],
    }) as RevertDeepSignal<Item>,
  );

  const handleCreate = () => ({
    id: PublicKey.random().toHex(),
    text: new TextObject(),
  });

  const handleDelete = () => {};

  return (
    <DensityProvider density='fine'>
      <Outliner.Root
        className={inputSurface}
        root={root}
        onCreate={handleCreate}
        onDelete={handleDelete}
        isTasklist={isTasklist}
      />
    </DensityProvider>
  );
};

export default {
  component: Outliner,
  render: Story,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
export const Checkbox = {
  args: {
    isTasklist: true,
  },
};
