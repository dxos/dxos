//
// Copyright 2025 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { type Obj } from '@dxos/echo';
import { Attention } from '@dxos/react-ui-attention/types';

/** Canonical qualified path to the presentation companion node for an object. */
export const getPresentationPath = (objectPath: string): string =>
  `${objectPath}/${Attention.linkedSegment('presenter')}`;

/**
 * Whether the object is currently being presented. Callers that flip presentation need this: the
 * operation sets an explicit state rather than toggling, so the intent lives at the call site.
 */
export const isPresenting = (ephemeral: { fullscreen?: string }, object: Obj.Unknown): boolean =>
  ephemeral.fullscreen === getPresentationPath(GraphPath.getObjectPathFromObject(object));
