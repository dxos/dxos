//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { TextObject } from '@dxos/client/echo';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';

import { ScriptEditor } from './ScriptEditor';

// prettier-ignore
const code = [
  'export default function() {',
  '  const value = 100',
  '  return <div>{value}</div>;',
  '}',
].join('\n');

const Story = () => {
  const [source, setSource] = useState<TextObject>();
  useEffect(() => {
    setSource(new TextObject(code, TextKind.PLAIN));
  }, []);

  return (
    <div className={'flex fixed inset-0'}>
      <ScriptEditor id='test' source={source} />
    </div>
  );
};

export default {
  title: 'plugin-script/ScriptEditor',
  component: ScriptEditor,
  render: Story,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
