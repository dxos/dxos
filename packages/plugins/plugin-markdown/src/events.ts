//
// Copyright 2025 DXOS.org
//

import { type ActivationEvent, Common } from '@dxos/app-framework';

import { meta } from './meta';

export namespace MarkdownEvents {
  export const SetupExtensions: ActivationEvent.ActivationEvent = Common.ActivationEvent.createStateEvent(
    `${meta.id}/event/setup-extensions`,
  );
}
