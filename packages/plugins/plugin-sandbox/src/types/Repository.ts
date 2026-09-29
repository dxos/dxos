//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

export const SKILL_KEY = 'org.dxos.skill.repository';

/**
 * ECHO object representing a git repository hosted by EDGE (Cloudflare Artifacts).
 * The object id is used as the repository id in the sandbox service. Sandboxes are ephemeral;
 * a repository is where what they build is kept.
 */
export class Repository extends Type.makeObject<Repository>(DXN.make('org.dxos.type.repository', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    defaultBranch: Schema.optional(Schema.String),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--git-branch--regular', hue: 'green' }),
    Annotation.UserType.set(),
  ),
) {}

/**
 * Constructs a `Repository` ECHO object from the given props.
 */
export const make = (props: Obj.MakeProps<typeof Repository> = {}): Repository => Obj.make(Repository, props);
