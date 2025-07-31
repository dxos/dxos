//
// Copyright 2025 DXOS.org
//

import { Events } from '@dxos/app-framework';

import { meta } from './meta';

export namespace MarkdownEvents {
  export const SetupExtensions = Events.createStateEvent(`${meta.id}/setup-extensions`);
}
