//
// Copyright 2025 DXOS.org
//

import { AiTool, AiToolkit } from '@effect/ai';
import { Effect, Schema } from 'effect';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { SpaceCapabilities } from '@dxos/plugin-space';

class SchemaToolkit extends AiToolkit.make(
  AiTool.make('list-schemas', {
    description: 'List the available schemas.',
    parameters: {},
    success: Schema.Struct({
      schemas: Schema.Array(Schema.String.annotations({ description: 'The typename of the schema.' })),
    }),
    failure: Schema.Never,
  }),
) {
  static layer = (context: PluginContext) =>
    SchemaToolkit.toLayer({
      'list-schemas': () =>
        Effect.gen(function* () {
          log.info('list-schemas');
          const forms = context.getCapabilities(SpaceCapabilities.ObjectForm);
          const schemas = forms.map((form) => Type.getTypename(form.objectSchema));
          return { schemas };
        }),
    });
}

export default (context: PluginContext) => [
  contributes(Capabilities.Toolkit, SchemaToolkit),
  contributes(Capabilities.ToolkitHandler, SchemaToolkit.layer(context)),
];
