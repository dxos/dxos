//
// Copyright 2026 DXOS.org
//

/**
 * Marks a `Schema.String` field as the integration-source picker.
 *
 * Used in {@link Integration}'s create-dialog `inputSchema` to flag the
 * `source` field. A `role: 'form-input'` Surface contributed by
 * `plugin-integration` filters by this annotation and renders a dropdown
 * populated from currently-registered `IntegrationProvider` capability
 * entries — so adding/removing a service plugin updates the form
 * immediately without rebuilding the schema.
 *
 * Pattern modeled after `PivotColumnAnnotationId` in `plugin-kanban`.
 */
export const IntegrationSourceAnnotationId = Symbol.for('@dxos/plugin-integration/annotation/IntegrationSource');
