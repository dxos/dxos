//
// Copyright 2023 DXOS.org
//

// @ts-ignore
import esbuildWasmURL from 'esbuild-wasm/esbuild.wasm?url';
import React, { useEffect, useMemo, useState } from 'react';

import { TextObject } from '@dxos/client/echo';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { mx } from '@dxos/react-ui-theme';

import { FrameContainer } from './FrameContainer';
import { ScriptEditor } from './ScriptEditor';
import { Compiler, type CompilerResult, initializeCompiler } from '../compiler';

// TODO(burdon): Editor import resolution.
// TODO(burdon): Reference React components from lib (e.g., Explorer).
// TODO(burdon): Generate runtime effect/schema definitions from echo Schema.

const code = [
  "import React, { useEffect } from 'react';",
  "import { Expando } from '@dxos/client/echo';",
  "import { useClient } from '@dxos/react-client';",
  "import { Globe } from '@braneframe/plugin-explorer';",
  '',
  'const Component = () => {',
  '  const client = useClient();',
  '  useEffect(() => {',
  '    client.spaces.default.db.add(new Expando());',
  '  }, []);',
  '',
  '  const { objects } = client.spaces.query();',
  '  return <Globe objects={objects} />',
  // "  return <div className='m-2 p-2 text-red-500'>{objects.length}</div>;",
  '}',
  '',
  'export default Component;',
].join('\n');

export type ScriptMainProps = {
  content: TextObject;
  className?: string;
};

export const ScriptMain = ({ content: initialContent, className }: ScriptMainProps) => {
  const [content, setContent] = useState<TextObject>(); // TODO(burdon): Get from space.
  useEffect(() => {
    setContent(new TextObject(code, TextKind.PLAIN)); // TODO(burdon): Set initial value.
  }, []);

  const [result, setResult] = useState<CompilerResult>();
  const compiler = useMemo(() => new Compiler({ platform: 'browser' }), []);
  useEffect(() => {
    // TODO(burdon): Change to useCompiler hook (with initialization).
    void initializeCompiler({ wasmURL: esbuildWasmURL });
  }, []);

  const handleExec = async (source: string) => {
    const result = await compiler.compile(source);
    setResult(result);
  };

  if (!content) {
    return null;
  }

  return (
    <div className={mx('flex w-full overflow-hidden m-8', className)}>
      <div className='flex flex-1 shrink-0 overflow-x-auto'>
        <ScriptEditor content={content} onExec={handleExec} />
      </div>
      {result && (
        <div className='flex flex-1 shrink-0 overflow-hidden'>
          <FrameContainer result={result} />
        </div>
      )}
    </div>
  );
};
