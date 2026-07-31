//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { meta } from '#meta';

export const SetupCompiler = ActivationEvent.make(`${meta.profile.key}.event.setupCompiler`);
