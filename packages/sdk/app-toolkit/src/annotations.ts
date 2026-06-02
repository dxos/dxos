//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';

// Re-exported here for convenience; authoritative definition lives in @dxos/client-protocol
// to avoid a circular dep with @dxos/schema.
export { RootCollectionAnnotation } from '@dxos/client-protocol/types';

/** Blueprint keys associated with a schema type. Used by AI companion to auto-load blueprints. */
export const BlueprintsAnnotation = Annotation.make<string[]>({
  id: 'org.dxos.annotation.blueprints',
  schema: Schema.mutable(Schema.Array(Schema.String)),
});

/** Graph node properties derived from schema (e.g. autofocus behavior). */
export const GraphPropsAnnotation = Annotation.make<{ managesAutofocus?: boolean }>({
  id: 'org.dxos.annotation.graph-props',
  schema: Schema.Struct({ managesAutofocus: Schema.optional(Schema.Boolean) }),
});

