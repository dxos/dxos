//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';
import { EditorView } from '@codemirror/view';
import React, { useEffect } from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { TextEditor } from './TextEditor';
import { markdownBundle } from '../../extensions';
import { useTextEditor } from '../../hooks';
import { defaultTheme } from '../../themes';

// TODO(burdon): Build components from hooks and adapters for model/extensions, etc.

const Story = () => {
  const { parentRef, view } = useTextEditor({
    extensions: [
      //
      EditorView.baseTheme(defaultTheme),
      markdownBundle({ placeholder: 'Text...' }),
    ],
  });

  useEffect(() => {
    view?.focus();
  }, [view]);

  return <div role='none' ref={parentRef} />;
};

export default {
  title: 'react-ui-editor/useTextEditor',
  component: TextEditor,
  decorators: [withTheme],
};

export const Default = {
  render: () => <Story />,
};
