//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { SettingsNamespace } from './namespace.ts';

export class Open extends Schema.TaggedClass<Open>()(`${SettingsNamespace.key}.open`, {
  input: Schema.Struct({
    plugin: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
}) {}

export class OpenPluginRegistry extends Schema.TaggedClass<OpenPluginRegistry>()(
  `${SettingsNamespace.key}.openPluginRegistry`,
  {
    input: Schema.Void,
    output: Schema.Void,
  },
) {}
