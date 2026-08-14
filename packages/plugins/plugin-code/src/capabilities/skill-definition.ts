//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { CoderSkill, makeCoderSkill } from '#skills';

const skillDefinition = () =>
  Effect.gen(function* () {
    // Lazy capability access: the skill is made after activation, when the client exists.
    const capabilities = yield* Capability.Service;
    return [
      Capability.contribute(AppCapabilities.SkillDefinition, {
        key: CoderSkill.key,
        make: () => {
          const client = capabilities.get(ClientCapabilities.Client);
          return makeCoderSkill({
            introspectMcpUrl: getEdgeServiceEndpoint(client.config, EdgeServiceName.Introspect),
          });
        },
      }),
    ];
  });

export default skillDefinition;
