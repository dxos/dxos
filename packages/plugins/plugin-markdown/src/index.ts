//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const MarkdownPlugin = Plugin.lazy(meta, () => import('./MarkdownPlugin'));

export * from './meta';

export { MarkdownCapabilities, MarkdownEvents } from './types';

export * from './util';

export { MarkdownEditor, MarkdownEditorProvider } from './components';
export type { MarkdownEditorEditorRootProps } from './components';
