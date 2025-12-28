//
// Copyright 2025 DXOS.org
//

import { Events, ActivationEvent } from '@dxos/app-framework';

import { meta } from './meta';

export namespace MarkdownEvents {
  export const SetupExtensions: ActivationEvent.ActivationEvent = Events.createStateEvent(`${meta.id}/event/setup-extensions`);
}
