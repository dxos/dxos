//
// Copyright 2024 DXOS.org
//

import { JsonSchemaType, QueryType } from '@dxos/echo-schema';
import { S } from '@dxos/effect';

/**
 * Views are generated or user-defined projections of a schema's properties.
 * They are used to configure the visual representation of the data.
 * The query is separate from the view (queries configure the projection of data objects).
 */
export const ViewSchema = S.Struct({
  schema: JsonSchemaType,
  query: QueryType,
});

export type ViewType = S.Schema.Type<typeof ViewSchema>;
