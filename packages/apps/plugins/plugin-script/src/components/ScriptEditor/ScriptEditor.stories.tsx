//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { TextObject } from '@dxos/client/echo';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { type YText } from '@dxos/text-model';

import { ScriptEditor } from './ScriptEditor';

const code = [
  "import React from 'react';",
  '',
  'const Component = () => {',
  '  const value = 100',
  '  return <div>{value}</div>;',
  '}',
  '',
  'export default Component;',
].join('\n');

const Story = () => {
  const [content, setContent] = useState<TextObject>();
  useEffect(() => {
    setContent(new TextObject(code, TextKind.PLAIN));
  }, []);

  if (!content) {
    return null;
  }

  return (
    <div className={'flex fixed inset-0'}>
      <ScriptEditor content={content.content as YText} />
    </div>
  );
};

export default {
  component: ScriptEditor,
  render: Story,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
