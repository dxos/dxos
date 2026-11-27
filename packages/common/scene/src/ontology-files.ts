//
// Copyright 2026 DXOS.org
//

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as Ontology from './ontology.ts';

/** The command that writes the generated files. */
export const TASK = 'moon run scene:gen-ontology';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Each generated file with the text it must hold, so the task and the test that guards it cannot disagree. */
export const outputs = (): readonly { readonly path: string; readonly content: string }[] => [
  {
    path: resolve(PACKAGE_ROOT, 'ontology.schema.json'),
    content: `${JSON.stringify(Ontology.toJsonSchema(), null, 2)}\n`,
  },
  {
    path: resolve(PACKAGE_ROOT, '../../../docs/src/content/docs/docs/tile/resources/scene-schema.md'),
    content: Ontology.toMarkdown(),
  },
];
