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

import React from 'react';

import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { TextObject } from '@dxos/react-client/echo';
import { useDocAccessor } from '@dxos/react-ui-editor';

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
  const { accessor } = useDocAccessor(new TextObject(examples[1], TextKind.PLAIN));
  return (
    <div className='flex fixed inset-0 bg-neutral-50'>
      <div className='flex w-[700px] mx-auto'>
        <ScriptEditor source={accessor} className='bg-white text-lg' />
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
