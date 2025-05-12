//
// Copyright 2025 DXOS.org
//

import { Events } from '@dxos/app-framework';

import { MARKDOWN_PLUGIN } from './meta';

export namespace MarkdownEvents {
  export const SetupExtensions = Events.createStateEvent(`${MARKDOWN_PLUGIN}/setup-extensions`);
}
