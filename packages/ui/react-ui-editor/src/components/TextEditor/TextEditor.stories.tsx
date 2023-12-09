//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { useState } from 'react';

import { TextObject } from '@dxos/echo-schema';
import { fixedInsetFlexLayout, groupSurface, inputSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { TextEditor } from './TextEditor';
import { useTextModel } from '../../model';

const Story = () => {
  const [item] = useState({ text: new TextObject('Hello world!') });
  const model = useTextModel({ text: item.text });

  return (
    <div className={mx(fixedInsetFlexLayout, groupSurface, 'p-4 gap-4')}>
      <TextEditor model={model} slots={{ root: { className: mx(inputSurface, 'px-2') } }} />
      <pre>{JSON.stringify(model?.content?.toString(), null, 2)}</pre>
    </div>
  );
};

export default {
  component: TextEditor,
  decorators: [withTheme],
  render: Story,
};

export const Default = {};
