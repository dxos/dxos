//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Obj } from '@dxos/echo';

/** The exporter contributed for the object's type, if any. */
export const getExporter = Effect.fnUntraced(function* (subject: unknown) {
  const typename = Obj.isObject(subject) ? Obj.getTypename(subject) : undefined;
  if (!typename) {
    return undefined;
  }

  const exporters = yield* Capability.getAll(AppCapabilities.Exporter);
  return exporters.find(({ id }) => id === typename);
});
