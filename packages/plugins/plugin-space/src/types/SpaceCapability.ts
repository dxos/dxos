//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';

import * as SpaceCapabilities from './SpaceCapabilities.ts';
import * as SpaceEvents from './SpaceEvents.ts';

/**
 * Module maker contributing a typed create-object entry. Gated by default on the create flow
 * opening (all consumers read the entries reactively); declare `activatesOn` to override.
 */
export const createObject = Capability.moduleMaker('CreateObject', SpaceCapabilities.CreateObjectEntry, {
  activatesOn: SpaceEvents.CreateObjectRequested,
});

/**
 * Module contributing space templates.
 *
 * Gated on demand, and loader-only: a template carries the content it writes, which is bulky and of
 * interest to nobody who has not asked for the list — an inline array is a static import in the
 * plugin definition, so the whole world lands in the definition's closure and every session pays
 * for it. The loader keeps it in its own chunk, which is what makes the gating worth anything.
 */
export const spaceTemplates = (
  loader: () => Promise<{ default: ReadonlyArray<SpaceCapabilities.SpaceTemplate> }>,
  options?: { name?: string; environments?: readonly Capability.Environment[] },
) =>
  Capability.lazyModule<readonly [typeof SpaceCapabilities.SpaceTemplate]>(
    options?.name ?? 'SpaceTemplates',
    {
      activatesOn: ActivationEvents.SpaceTemplatesRequested,
      provides: [SpaceCapabilities.SpaceTemplate],
      environments: options?.environments ?? [],
    },
    () =>
      loader().then(({ default: templates }) => ({
        default: () => Effect.succeed([Capability.contributeAll(SpaceCapabilities.SpaceTemplate, templates)]),
      })),
  );
