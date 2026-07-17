//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { meta } from '#meta';

/** @deprecated Ordering-only; declare `requires: [MarkdownCapabilities.ExtensionProvider]` or read the live contributions view instead. */
export const SetupExtensions: ActivationEvent.ActivationEvent = AppActivationEvents.createStateEvent(
  `${meta.profile.key}.event.setup-extensions`,
);
