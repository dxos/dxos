//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Typescript.
// TODO(burdon): Effect schema.
// TODO(burdon): JSX.
// TODO(burdon): react-buddy for storybook?

// Marijn
// - language support for S
// - hierarchical editor (DND)
// - virtual document image rendering
// - mobile rendering error

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { TextObject } from '@dxos/client/echo';
import { createDocAccessor, type DocAccessor } from '@dxos/echo-schema';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';

import { ScriptEditor } from './ScriptEditor';

const examples: string[] = [
  [
    '// Example schema.',
    'export default function() {',
    '  const value = 100',
    '  return <div>{value}</div>;',
    '}',
  ].join('\n'),
  [
    '// Example schema.',
    'S.struct({',
    '  timestamp: S.Date,',
    '  title: S.string,',
    '  content: R.Text,',
    "}).pipe(S.identifier('dxos.org/schema/Test'))",
    '',
  ].join('\n'),
];

const Story = () => {
  const [source, setSource] = useState<DocAccessor>();
  useEffect(() => {
    setSource(createDocAccessor(new TextObject(examples[1], TextKind.PLAIN)));
  }, []);

  if (!source) {
    return null;
  }

  return (
    <div className='flex fixed inset-0 bg-neutral-50'>
      <div className='flex w-[700px] mx-auto'>
        <ScriptEditor source={source} className='bg-white text-lg' />
      </div>
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
