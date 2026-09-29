//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ObservabilityMapping from '@dxos/app-toolkit/ObservabilityMapping';
import { Annotation } from '@dxos/echo';
import { MigrationVersionAnnotation } from '@dxos/migrations';

import { SpaceOperation } from '#types';

type ObservabilityMappingsOptions = {
  observability?: boolean;
};

/**
 * The events a space operation's invocation stands for, registered rather than emitted: the verbs
 * are invoked on headless hosts that have no telemetry plugin, and a handler that sends its own
 * event would bind them to one.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* ({ observability }: ObservabilityMappingsOptions) {
    // Contributed even when the host opts out, so the capability the listener requires always
    // resolves; the empty registration is what turns the events off.
    if (!observability) {
      return [Capability.contribute(AppCapabilities.ObservabilityMapping, [])];
    }

    return [
      Capability.contribute(AppCapabilities.ObservabilityMapping, [
        ObservabilityMapping.make({
          operation: SpaceOperation.Migrate,
          event: 'space.migrate',
          properties: (input) => ({
            spaceId: input.space.id,
            targetVersion: input.version,
            version: Annotation.get(input.space.properties, MigrationVersionAnnotation).pipe(Option.getOrUndefined),
          }),
        }),
      ]),
    ];
  }),
);
