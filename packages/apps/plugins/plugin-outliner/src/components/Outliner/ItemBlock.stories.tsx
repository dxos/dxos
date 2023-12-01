//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { useState } from 'react';

import { TextObject } from '@dxos/client/echo';

import { ItemBlock } from './ItemBlock';

const Story = () => {
  const [text] = useState({ id: 'item-1', text: new TextObject('Hello') });

  return (
    <div className='m-2 p-2 ring'>
      <ItemBlock id={text.id} text={text.text} />
    </div>
  );
};

export default {
  component: ItemBlock,
  render: Story,
};

export const Default = {};
