//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type TextObject } from '@dxos/client/echo';
import { MarkdownEditor, useTextModel } from '@dxos/react-ui-editor';

export const ItemBlock: FC<{ item: { id: string; text: TextObject } }> = ({ item }) => {
  const model = useTextModel({ text: item.text });

  return (
    <div className='flex p-2'>
      {model && (
        <MarkdownEditor
          model={model}
          slots={{
            root: {
              className: 'w-full',
            },
          }}
        />
      )}
    </div>
  );
};
