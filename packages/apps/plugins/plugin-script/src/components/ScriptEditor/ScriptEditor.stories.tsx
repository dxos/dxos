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

import React, { useMemo } from 'react';

import { createDocAccessor, createEchoObject } from '@dxos/echo-schema';

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
  // TODO(dmaretskyi): Review what's the right way to create automerge-backed objects.
  const object = useMemo(() => createEchoObject({ content: examples[1] }), []);
  const accessor = useMemo(() => createDocAccessor(object, ['content']), [object]);
  return (
    <div className='flex fixed inset-0 bg-neutral-50'>
      <div className='flex w-[700px] mx-auto'>
        {accessor && <ScriptEditor source={accessor} className='bg-white text-lg' />}
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
