//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ConnectorAnnotationId } from './annotations';

/**
 * Form schema for the create-Connection dialog. `{@link ConnectorAnnotationId}`
 * tags `connectorId` so plugin-connector renders a connector dropdown.
 */
export const CreateConnectionForm = Schema.Struct({
  connectorId: Schema.String.annotations({
    title: 'Service',
    [ConnectorAnnotationId]: true,
  }),
});
