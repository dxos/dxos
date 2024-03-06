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
import { type VirtualTypeScriptEnvironment } from '@typescript/vfs';
import React, { useEffect, useState } from 'react';

import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { createDocAccessor, TextObject, type DocAccessor } from '@dxos/react-client/echo';

import { ScriptEditor } from './ScriptEditor';
import { createEnv } from '../../ts';

const examples: string[] = [
  [
    //
    '// Example TS.',
    'const value = 100;',
    'console.log(value);',
  ].join('\n'),
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
  const [env, setEnv] = useState<VirtualTypeScriptEnvironment>();
  useEffect(() => {
    setSource(createDocAccessor(new TextObject(examples[0], TextKind.PLAIN)));
    setTimeout(async () => {
      setEnv(await createEnv());
    });
  }, []);

  if (!source || !env) {
    return null;
  }

  return (
    <div className='flex fixed inset-0 bg-neutral-50'>
      <div className='flex w-[700px] mx-auto'>
        <ScriptEditor source={source} className='bg-white text-lg' env={env} path='index.ts' />
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
