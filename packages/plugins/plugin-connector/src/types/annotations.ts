//
// Copyright 2026 DXOS.org
//

/**
 * Marks a `Schema.String` field as the connector picker.
 *
 * Used in the create-Connection dialog's `inputSchema` to flag the
 * `connectorId` field. A `role: 'form-input'` Surface contributed by
 * `plugin-connector` filters by this annotation and renders a dropdown
 * populated from currently-registered `Connector` capability entries — so
 * adding/removing a service plugin updates the form immediately without
 * rebuilding the schema.
 *
 * Pattern modeled after `PivotColumnAnnotationId` in `plugin-kanban`.
 */
export const ConnectorAnnotationId = Symbol.for('@dxos/plugin-connector/annotation/Connector');
