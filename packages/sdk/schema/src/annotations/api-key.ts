//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';

/**
 * Lists the domains recognized by a property holding {@link APIKey} entries
 * (e.g. `['maptiler.com']`), so a settings form can hint or validate which
 * services a user may supply credentials for.
 */
export const RecognizedDomainsAnnotationId = '@dxos/schema/annotation/RecognizedDomains';
export const RecognizedDomainsAnnotation = Annotation.make({
  id: RecognizedDomainsAnnotationId,
  schema: Schema.Array(Schema.String),
  legacyId: true,
});
