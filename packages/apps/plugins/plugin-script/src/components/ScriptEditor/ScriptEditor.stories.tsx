//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { initialize } from 'esbuild-wasm';
// @ts-ignore
import esbuildWasmURL from 'esbuild-wasm/esbuild.wasm?url';
import React, { useEffect, useMemo, useState } from 'react';

import { TextObject } from '@dxos/client/echo';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import { ScriptEditor } from './ScriptEditor';
import { Compiler, type CompilerResult } from '../../compiler';
import { FrameContainer } from '../FrameContainer';

// TODO(burdon): Editor import resolution.
// TODO(burdon): Reference React components from lib (e.g., Explorer).
// TODO(burdon): Generate runtime effect/schema definitions from echo Schema.

const code = [
  "import React, { useEffect } from 'react';",
  "import { Expando } from '@dxos/client/echo';",
  "import { useClient } from '@dxos/react-client';",
  '',
  'const Component = () => {',
  '  const client = useClient();',
  '  useEffect(() => {',
  '    client.spaces.default.db.add(new Expando());',
  '  }, []);',
  '',
  '  const { objects } = client.spaces.query();',
  "  return <div className='m-2 p-2 ring'>{objects.length}</div>;",
  '}',
  '',
  'export default Component;',
].join('\n');

const Story = () => {
  const [result, setResult] = useState<CompilerResult>();
  const compiler = useMemo(() => new Compiler({ platform: 'browser' }), []);
  const [content, setContent] = useState<TextObject>();
  useEffect(() => {
    setContent(new TextObject(code, TextKind.PLAIN));
    setTimeout(async () => {
      await initialize({
        wasmURL: esbuildWasmURL,
      });
    });
  }, []);

  const handleExec = async (source: string) => {
    const result = await compiler.compile(source);
    setResult(result);
  };

  if (!content) {
    return null;
  }

  return (
    <div className={'flex flex-col w-full overflow-hidden m-8'}>
      <ScriptEditor content={content} className={'h-[332px]'} onExec={handleExec} />
      {result && <FrameContainer result={result} />}
    </div>
  );
};

export default {
  component: ScriptEditor,
  render: Story,
  decorators: [ClientSpaceDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
