//
// Copyright 2025 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { meta } from '#meta';

export namespace SpaceEvents {
  /** Runtime event: fired imperatively when a space is created. */
  export const SpaceCreated = ActivationEvent.make(`${meta.profile.key}.event.spaceCreated`);
  /** Runtime event: fired imperatively when a type is added to a space. */
  export const TypeAdded = ActivationEvent.make(`${meta.profile.key}.event.typeAdded`);
  /**
   * Demand signal: a create-object flow opened (dialog/panel mount, or a schema node's create
   * actions were computed). Activation policies park `CreateObjectEntry` providers on this so
   * their chunks load when the user first goes to create an object, not at startup. Consumers
   * read the entries reactively, so late contributions pop into the open picker.
   */
  export const CreateObjectRequested = ActivationEvent.make(`${meta.profile.key}.event.createObjectRequested`);
}
