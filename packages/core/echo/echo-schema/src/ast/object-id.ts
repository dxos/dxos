import { S } from '@dxos/effect';

// TODO(dmaretskyi): Brand.
/**
 * Unique object identifier.
 */
export type ObjectId = string;

/**
 * Schema for the `id` field of an object.
 */
export const ObjectId: S.Schema<ObjectId, ObjectId> = S.String.annotations({
  description: 'Unique object identifier.',
});

/**
 * Marker interface for object with an `id`.
 */
export interface HasId {
  readonly id: ObjectId;
}
