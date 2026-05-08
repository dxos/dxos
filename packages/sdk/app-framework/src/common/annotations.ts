//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';

/**
 * Graph node properties derived from schema (e.g. autofocus behavior).
 */
export const GraphPropsAnnotation = Annotation.make<{ managesAutofocus?: boolean }>({
  id: 'org.dxos.annotation.graph-props',
  schema: Schema.Struct({ managesAutofocus: Schema.optional(Schema.Boolean) }),
});
