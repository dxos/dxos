//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';

/**
 * Marks a schema type whose collection tiles render a content preview body via the
 * `AppSurface.CardContent` surface (rather than a header-only card).
 *
 * @idiom org.dxos.annotation.card-content
 *   applies: Rendering a richer card body (via the CardContent surface) for a type's tiles in a type-collection view
 *   instead-of: Leaving the type unannotated, which renders a header-only tile
 *   uses: {@link CardAnnotation}
 */
export const CardAnnotation = Annotation.make<boolean>({
  id: 'org.dxos.annotation.card-content',
  schema: Schema.Boolean,
});
