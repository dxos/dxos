//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';

import { mdl, mdlBlockDescription } from '@dxos/deus/extension';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
} from '@dxos/ui-editor';

export type MdlExtensionsOptions = {
  themeMode: NonNullable<Parameters<typeof createThemeExtensions>[0]>['themeMode'];
  readOnly?: boolean;
  lineNumbers?: boolean;
  lineWrapping?: boolean;
  /** Fenced languages besides MDL's own. */
  codeLanguages?: NonNullable<Parameters<typeof createMarkdownExtensions>[0]>['codeLanguages'];
  /** The specs that references are checked against. */
  index?: NonNullable<Parameters<typeof mdl>[0]>['index'];
  /** Binds the editor to an ECHO text; without it, the host passes static content to the view. */
  data?: Parameters<typeof createDataExtensions>[0];
};

/** The extensions every MDL editor shares: markdown with MDL highlighting and fences, themed as a document. */
export const createMdlExtensions = ({
  themeMode,
  readOnly,
  lineNumbers,
  lineWrapping,
  codeLanguages = [],
  index,
  data,
}: MdlExtensionsOptions): Extension[] => [
  createBasicExtensions({ lineNumbers, lineWrapping, readOnly }),
  createMarkdownExtensions({ codeLanguages: [mdlBlockDescription, ...codeLanguages] }),
  createThemeExtensions({ themeMode, slots: documentSlots }),
  decorateMarkdown(),
  mdl({ index }),
  ...(data ? createDataExtensions(data) : []),
];
