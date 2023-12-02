//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { Document as DocumentType } from '@braneframe/types';
import { MarkdownEditor, useTextModel } from '@dxos/react-ui-editor';
import { fixedInsetFlexLayout, groupSurface, inputSurface, mx } from '@dxos/react-ui-theme';

import { TextEditor } from './TextEditor';

const Story = () => {
  const [doc] = useState<DocumentType>(new DocumentType());
  const model = useTextModel({ text: doc.content });
  // const [item] = useState({ text: new TextObject('Hello world!') });
  // const model = useTextModel({ text: item.text });

  return (
    <div className={mx(fixedInsetFlexLayout, groupSurface, 'p-4 gap-4')}>
      {/* <TextEditor model={model} slots={{ root: { className: mx(inputSurface, 'px-2') } }} /> */}
      <MarkdownEditor model={model} slots={{ root: { className: mx(inputSurface, 'px-2') } }} />
      <pre>{JSON.stringify(model?.content?.toString(), null, 2)}</pre>
    </div>
  );
};

export default {
  component: TextEditor,
  render: Story,
};

export const Default = {};
