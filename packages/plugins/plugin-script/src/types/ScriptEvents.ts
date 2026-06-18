//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { ActivationEvent } from '@dxos/app-framework';

import { meta } from '#meta';

export const SetupCompiler = ActivationEvent.make(`${meta.profile.key}.event.setup-compiler`);
