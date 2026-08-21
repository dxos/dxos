//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { DatabaseSkill } from '#skills';

/**
 * The Database skill alone: its verbs are addressed to one space's database, which a worker host
 * supplies per invocation. The Space skill is absent because `querySpaces` reads `client.spaces`,
 * and a worker has no client — its session's spaces come from its own grant.
 */
const skillDefinition = () => Effect.succeed([Capability.contribute(AppCapabilities.SkillDefinition, DatabaseSkill)]);

export default skillDefinition;
