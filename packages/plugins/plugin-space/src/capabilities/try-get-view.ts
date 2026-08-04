//
// Copyright 2025 DXOS.org
//

// Surface components that cannot be expressed as a `props` mapper, because they call hooks or must
// render nothing until an ambient value (the active space, a backing view) resolves.
import * as Option from 'effect/Option';

import { Obj, Type, type View } from '@dxos/echo';
import { ViewAnnotation } from '@dxos/schema';

// Kept out of `SpaceSurfaces.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/**
 * Resolves the view backing an object through its type's `ViewAnnotation` path. The
 * `objectProperties` filter and both consuming surfaces must agree, so they share this.
 */
export const tryGetViewForObject = (subject: Obj.Unknown): View.View | undefined => {
  const type = Obj.getType(subject);
  const path = type ? Option.getOrElse(ViewAnnotation.get(Type.getSchema(type)), () => [] as readonly string[]) : [];
  return path.length > 0 ? ViewAnnotation.tryGetTargetAlongPath(subject, path) : undefined;
};
