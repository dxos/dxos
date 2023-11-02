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
  "import { useQuery, useSpace } from '@dxos/react-client/echo';",
  "import { Globe } from '@braneframe/plugin-explorer';",
  '',
  'const Component = () => {',
  '  const space = useSpace();',
  '  const objects = useQuery(space,',
  "    object => object.__typename === 'dxos.org/schema/person');",
  // "  const { objects } = client.spaces.query({ type: 'dxos.org/schema/person' });",
  '',
  '  return <Globe objects={objects} />',
  // "return <div className='p-2'>{objects.length}</div>;",
  '}',
  '',
  'export default Component;',
].join('\n');

export type ScriptMainProps = {
  content: TextObject;
  mainUrl: string;
  className?: string;
};

export const ScriptMain = ({ content: initialContent, mainUrl, className }: ScriptMainProps) => {
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
        <ScriptEditor content={content} onChangeView={() => setResult(undefined)} onExec={handleExec} />
      </div>
      {result && (
        <div className='flex flex-1 shrink-0 overflow-hidden'>
          <FrameContainer result={result} mainUrl={mainUrl} />
        </div>
      )}
    </div>
  );
};
