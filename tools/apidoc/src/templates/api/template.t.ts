//
// Copyright 2022 DXOS.org
//
import path from 'node:path';
import { JSONOutput } from 'typedoc';
import { directory } from '@dxos/plate';

import * as url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export type Input = JSONOutput.ProjectReflection & {
  packagesPath: string;
};

export default directory<Input>({
  src: __filename.endsWith('.ts') ? __dirname : path.resolve(__dirname, '../../../../src/templates/api'),
})