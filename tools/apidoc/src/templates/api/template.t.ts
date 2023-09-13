//
// Copyright 2022 DXOS.org
//
import path from 'node:path';
import { JSONOutput } from 'typedoc';
import { directory } from '@dxos/plate';

export type Input = JSONOutput.ProjectReflection;

export default directory<Input>({
  src: __filename.endsWith('.ts') ? __dirname : path.resolve(__dirname, '../../../../src/templates/api'),
})