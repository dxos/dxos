//
// Copyright 2025 DXOS.org
//

import { AiTool, AiToolkit } from '@effect/ai';
import { Effect, Schema } from 'effect';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { Filter, Type } from '@dxos/echo';
import { DatabaseService } from '@dxos/functions';
import { ClientCapabilities } from '@dxos/plugin-client';
import { SpaceCapabilities, getActiveSpace } from '@dxos/plugin-space';
import { DataType } from '@dxos/schema';

class SchemaToolkit extends AiToolkit.make(
  AiTool.make('get-schemas', {
    description: 'Retrieves the available schemas.',
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
      'get-schemas': () => {
        const space = getActiveSpace(context);
        const service = space ? DatabaseService.makeLayer(space.db) : DatabaseService.notAvailable;
        return Effect.gen(function* () {
          const forms = context.getCapabilities(SpaceCapabilities.ObjectForm);
          const allowed = context.getCapabilities(ClientCapabilities.SchemaWhiteList).flat();
          const schemas = [...forms.map((form) => form.objectSchema), ...allowed].map((schema) =>
            Type.getTypename(schema),
          );
          if (space) {
            const { objects } = yield* DatabaseService.runQuery(Filter.type(DataType.StoredSchema));
            schemas.push(...objects.map((object) => object.typename));
          }
          return schemas;
        }).pipe(Effect.provide(service));
      },
    });
}

export default (context: PluginContext) => [
  contributes(Capabilities.Toolkit, SchemaToolkit),
  contributes(Capabilities.ToolkitHandler, SchemaToolkit.layer(context)),
];
