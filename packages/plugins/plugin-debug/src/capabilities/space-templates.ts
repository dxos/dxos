//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { hues, iconValues } from '@dxos/ui-types';

/**
 * Standard space icons, so a template's default is one the icon picker can also produce. Every entry
 * must BE an `iconValues` name: the filter drops anything else silently, and a list that shrinks
 * below the number of templates hands two of them the same icon.
 */
const templateIcons = ['campfire', 'planet', 'users-three', 'graph'].filter((icon) => iconValues.includes(icon));

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
        icon: templateIcons[index % templateIcons.length] ?? iconValues[index % iconValues.length],
        hue: hues[index % hues.length],
        apply: sample.apply,
      })),
    );
  }),
);
