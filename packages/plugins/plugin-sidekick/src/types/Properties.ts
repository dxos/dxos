//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Type } from '@dxos/echo';

export const Properties = Schema.Struct({
  journalEnabled: Schema.optional(Schema.Boolean),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.sidekick.properties',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--brain--regular',
    hue: 'violet',
  }),
);

export interface Properties extends Schema.Schema.Type<typeof Properties> {}
