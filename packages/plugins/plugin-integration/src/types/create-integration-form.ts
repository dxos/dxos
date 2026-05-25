//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { IntegrationProviderAnnotationId } from './annotations';

/**
 * Form schema for the create-Integration dialog. `{@link IntegrationProviderAnnotationId}`
 * tags `providerId` so plugin-integration renders a provider dropdown.
 */
export const CreateIntegrationForm = Schema.Struct({
  providerId: Schema.String.annotations({
    title: 'Service',
    [IntegrationProviderAnnotationId]: true,
  }),
});
