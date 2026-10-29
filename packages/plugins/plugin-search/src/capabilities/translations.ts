//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { translations } from '#translations';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(AppCapabilities.Translations, translations)),
);
