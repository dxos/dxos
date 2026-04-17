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

/**
 * A Linear issue. Minimal shape — the interesting fields for the demo.
 */
export const LinearIssue = Schema.Struct({
  linearIssueId: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** Issue identifier in the form "ENG-123". */
  identifier: Schema.String.pipe(FormInputAnnotation.set(false)),
  title: Schema.String.pipe(FormInputAnnotation.set(false)),
  description: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Workflow state: 'backlog' | 'started' | 'completed' | 'canceled' | etc. */
  state: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Team key (e.g. "ENG"). */
  teamKey: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Linear login of the assignee, if any. */
  assignee: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** ISO timestamp of last update in Linear. */
  updatedAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Labels attached to the issue. */
  labels: Schema.optional(Schema.Array(Schema.String).pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.linearIssue',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['title']),
  Annotation.IconAnnotation.set({
    icon: 'ph--list-checks--regular',
    hue: 'violet',
  }),
);
export interface LinearIssue extends Schema.Schema.Type<typeof LinearIssue> {}
