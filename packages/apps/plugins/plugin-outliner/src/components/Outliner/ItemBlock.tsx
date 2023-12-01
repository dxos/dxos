//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type TextObject } from '@dxos/client/echo';
import { MarkdownEditor, type MarkdownEditorProps, useTextModel } from '@dxos/react-ui-editor';

export const ItemBlock: FC<{ id: string; text: TextObject }> = ({ id, text }) => {
  const model = useTextModel({ text });

  const handleCursor: MarkdownEditorProps['onCursor'] = ({ event: { key }, line, lines }) => {
    console.log({ key, line, lines });
  };

  if (!model) {
    return null;
  }

  return (
    <MarkdownEditor
      key={id}
      model={model}
      slots={{
        root: {
          className: 'w-full',
        },
      }}
      onCursor={handleCursor}
    />
  );
};
