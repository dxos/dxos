export const LEGACY_REFERENCE_TYPE_TAG = 'dxos.echo.model.document.Reference';

/**
 * Reference as it is stored in Automerge document.
 */
export type LegacyEncodedReferenceObject = {
  '@type': typeof LEGACY_REFERENCE_TYPE_TAG;
  itemId: string;
  protocol?: string;
  host?: string;
};

export const isLegacyReference = (value: any): boolean =>
  typeof value === 'object' && value !== null && value['@type'] === LEGACY_REFERENCE_TYPE_TAG;

export const LEGACY_TYPE_PROPERTIES = 'dxos.sdk.client.Properties';
