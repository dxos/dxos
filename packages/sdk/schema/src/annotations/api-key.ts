//
// Copyright 2026 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo/Annotation';

/**
 * Lists the domains recognized by a property holding {@link APIKey} entries
 * (e.g. `['maptiler.com']`), so a settings form can hint or validate which
 * services a user may supply credentials for.
 */
export const RecognizedDomainsAnnotationId = Symbol.for('@dxos/schema/annotation/RecognizedDomains');
export const RecognizedDomainsAnnotation = createAnnotationHelper<string[]>(RecognizedDomainsAnnotationId);
