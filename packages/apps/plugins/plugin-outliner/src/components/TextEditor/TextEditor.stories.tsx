//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { TextObject } from '@dxos/client/echo';
import { useTextModel } from '@dxos/react-ui-editor';
import { fixedInsetFlexLayout, groupSurface, inputSurface, mx } from '@dxos/react-ui-theme';

import { TextEditor } from './TextEditor';

const Story = () => {
  const model = useTextModel({ text: new TextObject() });

  return (
    <div className={mx(fixedInsetFlexLayout, groupSurface, 'p-4')}>
      <TextEditor model={model} slots={{ root: { className: inputSurface } }} />
    </div>
  );
};

export default {
  component: TextEditor,
  render: Story,
};

export const Default = {};
