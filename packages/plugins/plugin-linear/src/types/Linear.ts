//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

// @import-as-namespace

/**
 * A Linear workspace. One per Linear org the user has connected.
 */
export const LinearWorkspace = Schema.Struct({
  /** Linear workspace URL key (e.g. "dxos" for linear.app/dxos). */
  urlKey: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** Display name. */
  name: Schema.String.pipe(FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.linearWorkspace',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--buildings--regular',
    hue: 'violet',
  }),
);
export interface LinearWorkspace extends Schema.Schema.Type<typeof LinearWorkspace> {}

/**
 * A Linear team (a project scope inside a workspace).
 */
export const LinearTeam = Schema.Struct({
  linearTeamId: Schema.String.pipe(FormInputAnnotation.set(false)),
  key: Schema.String.pipe(FormInputAnnotation.set(false)),
  name: Schema.String.pipe(FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.linearTeam',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--users-three--regular',
    hue: 'violet',
  }),
);
export interface LinearTeam extends Schema.Schema.Type<typeof LinearTeam> {}

