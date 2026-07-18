//
// Copyright 2025 DXOS.org
//

import { ActivationEvent } from '@dxos/app-framework';

import { meta } from '#meta';

export namespace SpaceEvents {
  /** Runtime event: fired imperatively when a space is created. */
  export const SpaceCreated = ActivationEvent.make(`${meta.profile.key}.event.spaceCreated`);
  /** Runtime event: fired imperatively when a type is added to a space. */
  export const TypeAdded = ActivationEvent.make(`${meta.profile.key}.event.typeAdded`);
}
