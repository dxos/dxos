//
// Copyright 2025 DXOS.org
//

import { AiTool, AiToolkit } from '@effect/ai';
import { Effect, Schema } from 'effect';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';

class SchemaToolkit extends AiToolkit.make(
  AiTool.make('list-schemas', {
    description: 'List the available schemas.',
    parameters: {
      // TODO(wittjosiah): Remove this once parameter-less tools are fixed.
      limit: Schema.Number,
    },
    // TODO(dmaretskyi): Effect returns ({ result, encodedResult })
    success: Schema.Any,
    failure: Schema.Never,
  }),
) {
  static layer = (context: PluginContext) =>
    SchemaToolkit.toLayer({
      'list-schemas': Effect.fn(function* ({ limit }) {
        const forms = context.getCapabilities(SpaceCapabilities.ObjectForm);
        const schemas = forms.map((form) => Type.getTypename(form.objectSchema));
        return schemas;
      }),
    });
}

export default (context: PluginContext) => [
  contributes(Capabilities.Toolkit, SchemaToolkit),
  contributes(Capabilities.ToolkitHandler, SchemaToolkit.layer(context)),
];
