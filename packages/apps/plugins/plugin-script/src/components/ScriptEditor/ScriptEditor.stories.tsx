//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

// @ts-ignore
import esbuildWasmURL from 'esbuild-wasm/esbuild.wasm?url';
import React, { useEffect, useMemo, useState } from 'react';

import { TextObject } from '@dxos/client/echo';
import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { useClient } from '@dxos/react-client';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import { ScriptEditor } from './ScriptEditor';
import { Compiler, type CompilerResult, initializeCompiler } from '../../compiler';
import { FrameContainer } from '../FrameContainer';
// @ts-ignore
import mainUrl from '../FrameContainer/frame?url';

const code = [
  "import React, { useEffect } from 'react';",
  "import { Expando } from '@dxos/client/echo';",
  "import { useClient } from '@dxos/react-client';",
  "import { Globe } from '@braneframe/plugin-explorer';",
  '',
  'const Component = () => {',
  '  const client = useClient();',
  // '  useEffect(() => {',
  // '    client.spaces.default.db.add(new Expando());',
  // '  }, []);',
  '',
  "  const { objects } = client.spaces.query({ type: 'dxos.org/schema/person' });",
  // '  return <Globe objects={objects} />',
  "  return <div className='p-2'>{objects.length}</div>;",
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
      await initializeCompiler({ wasmURL: esbuildWasmURL });
    });
  }, []);

  const client = useClient();
  useEffect(() => {
    const generator = createSpaceObjectGenerator(client.spaces.default);
    generator.addSchemas();
    generator.createObjects({ count: 100 });
  }, []);

  const handleExec = async (source: string) => {
    const result = await compiler.compile(source);
    setResult(result);
  };

  if (!content) {
    return null;
  }

  return (
    <div className='flex w-full overflow-hidden m-8 h-[300px]'>
      <div className='flex flex-1 shrink-0 overflow-x-auto'>
        <ScriptEditor content={content} onExec={handleExec} />
      </div>
      {result && (
        <div className='flex flex-1 shrink-0 overflow-hidden'>
          <FrameContainer mainUrl={mainUrl} result={result} />
        </div>
      )}
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
