//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

/** Colours the generated spaces so a shelf of samples is distinguishable at a glance. */
const hues = ['indigo', 'teal', 'amber', 'rose'];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // The sample content is demand-gated; the create dialog is the demand.
    yield* Plugin.activate(ActivationEvents.SampleSpacesRequested);
    const samples = yield* Capability.getAll(AppCapabilities.SampleSpace);

    return Capability.contributeAll(
      SpaceCapabilities.SpaceTemplate,
      samples.map((sample, index) => ({
        id: sample.id,
        label: sample.label,
        description: sample.description,
        icon: 'ph--dice-five--regular',
        hue: hues[index % hues.length],
        apply: sample.apply,
      })),
    );
  }),
);
