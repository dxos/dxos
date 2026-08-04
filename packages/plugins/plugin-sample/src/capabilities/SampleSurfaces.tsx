//
// Copyright 2025 DXOS.org
//

// Surface components that cannot be expressed as a `props` mapper, because they call hooks.
// A mapper is a plain function run during render of the Surface host, not a component, so
// anything needing hooks lives here as a named component instead.

import React from 'react';

import { useAtomCapability } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';

import { SampleStatusIndicator } from '#components';
import { SampleDeckCompanion } from '#containers';
import { SampleCapabilities } from '#types';

/**
 * `useAtomCapability` subscribes to the settings atom reactively so the indicator hides/shows when
 * the setting is toggled. This must be in the component (not the filter) so the atom subscription
 * triggers re-renders.
 */
export const SampleStatusSurface = () => {
  const settings = useAtomCapability(SampleCapabilities.Settings);

  return settings.showStatusIndicator !== false ? <SampleStatusIndicator /> : null;
};

/** The workspace-wide companion panel is scoped to the active space rather than to a subject. */
export const SampleDeckCompanionSurface = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return (
    <SampleDeckCompanion role={AppSurface.deckCompanion('samplePanel').role} space={space} attendableId={space.id} />
  );
};
