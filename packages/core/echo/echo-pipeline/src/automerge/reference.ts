import { Reference } from '@dxos/echo-db';

export const REFERENCE_TYPE_TAG = 'dxos.echo.model.document.Reference';

/**
 * Reference as it is stored in Automerge document.
 */
export type EncodedReferenceObject = {
  '@type': typeof REFERENCE_TYPE_TAG;
  itemId: string | null;
  protocol: string | null;
  host: string | null;
};

export const encodeReference = (reference: Reference): EncodedReferenceObject => ({
  '@type': REFERENCE_TYPE_TAG,
  // NOTE: Automerge do not support undefined values, so we need to use null instead.
  itemId: reference.itemId ?? null,
  protocol: reference.protocol ?? null,
  host: reference.host ?? null,
});

export const decodeReference = (value: any) =>
  new Reference(value.itemId, value.protocol ?? undefined, value.host ?? undefined);

export const isEncodedReferenceObject = (value: any): value is EncodedReferenceObject =>
  typeof value === 'object' && value !== null && value['@type'] === REFERENCE_TYPE_TAG;
