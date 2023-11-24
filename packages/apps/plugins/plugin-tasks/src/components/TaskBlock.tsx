//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { MarkdownEditor, useTextModel } from '@dxos/react-ui-editor';

import { type Task } from './Task';

export const TaskBlock: FC<{ task: Task }> = ({ task }) => {
  const model = useTextModel({ text: task.text });

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
