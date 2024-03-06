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

import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { createDocAccessor, TextObject, type DocAccessor } from '@dxos/react-client/echo';

import { ScriptEditor } from './ScriptEditor';
import { TS } from '../../ts';

const examples: string[] = [
  [
    //
    '// Example schema.',
    'import * as S from "@effect/schema/Schema";',
    '',
    'const Contact = S.struct({',
    '});',
    '',
  ].join('\n'),
  [
    '// Example schema.',
    'import * as S from "@effect/schema/Schema";',
    '',
    'S.struct({',
    '  timestamp: S.Date,',
    '  title: S.string,',
    '  content: R.Text,',
    "}).pipe(S.identifier('dxos.org/schema/Test'))", // TODO(burdon): pipe not recognized by ATS.
    '',
  ].join('\n'),
];

const imports = [
  //
  'import * as S from "@effect/schema/Schema"',
];

const Story = () => {
  const [source, setSource] = useState<DocAccessor>();
  const [ts, setTs] = useState<TS>();
  useEffect(() => {
    setSource(createDocAccessor(new TextObject(examples[0], TextKind.PLAIN)));
    setTimeout(async () => {
      const ts = new TS();
      await ts.initialize();
      for (const statement of imports) {
        ts.import(statement);
      }
      setTs(ts);
    });
  }, []);

  if (!source || !ts) {
    return null;
  }

  return (
    <div className='flex fixed inset-0 bg-neutral-50'>
      <div className='flex w-[700px] mx-auto'>
        <ScriptEditor source={source} className='bg-white text-lg' env={ts.env} path='test.ts' />
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
