//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import queryApi from '@dxos/echo-query/api.d.ts?raw';
import { useAsyncEffect } from '@dxos/react-ui';

import { Compiler } from '../../compiler';
import { TypescriptEditor, type TypescriptEditorProps } from '../TypescriptEditor';

const GLOBALS = `
  namespace QueryAPI {
    ${queryApi}
  }

  declare global {
    const Query: typeof QueryAPI.Query;
    const Filter: typeof QueryAPI.Filter;
    const Order: typeof QueryAPI.Order;
  }

  export {};
`;

export type QueryEditorProps = Omit<TypescriptEditorProps, 'env'>;

export const QueryEditor = (props: QueryEditorProps) => {
  const [compiler, setCompiler] = useState<Compiler>();

  useAsyncEffect(async () => {
    const compiler = new Compiler();
    await compiler.initialize(GLOBALS);
    setCompiler(compiler);
  }, []);

  if (!compiler) {
    return null;
  }

  return <TypescriptEditor {...props} env={compiler.environment} />;
};
