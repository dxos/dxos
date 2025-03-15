//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
// @ts-ignore
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';
import React, { useEffect, useMemo, useState } from 'react';

import { initializeBundler } from '@dxos/functions/bundler';
import { createDocAccessor, createObject } from '@dxos/react-client/echo';
import { createDataExtensions } from '@dxos/react-ui-editor';
import { withTheme } from '@dxos/storybook-utils';

import { TypescriptEditor } from './TypescriptEditor';
import { Compiler } from '../../compiler';
import { templates } from '../../templates';

const DefaultStory = () => {
  const [compiler, setCompiler] = useState<Compiler>();
  const object = useMemo(() => createObject({ content: templates[4].source }), []);
  const initialValue = useMemo(() => object.content, [object]);
  const accessor = useMemo(() => createDocAccessor(object, ['content']), [object]);
  const extensions = useMemo(() => [createDataExtensions({ id: object.id, text: accessor })], [object.id, accessor]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const compiler = new Compiler();
      await compiler.initialize();
      await initializeBundler({ wasmUrl });
      setCompiler(compiler);
    });

    return () => clearTimeout(timeout);
  }, []);

  if (!compiler) {
    return <></>;
  }

  return <TypescriptEditor id='test' compiler={compiler} initialValue={initialValue} extensions={extensions} />;
};

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-script/TypescriptEditor',
  component: TypescriptEditor,
  render: DefaultStory,
  decorators: [withTheme],
};

export default meta;
