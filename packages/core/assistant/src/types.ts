//
// Copyright 2025 DXOS.org
//

import { type ObjectId } from '@dxos/echo-schema';
import { DXN, LOCAL_SPACE_TAG, SpaceId } from '@dxos/keys';
import { Schema } from 'effect';

export const createArtifactElement = (id: ObjectId) => `<artifact id=${id} />`;

/**
 * A model-friendly way to reference an object.
 * Supports vairous formats that will be normalized to a DXN.
 */
export const ArtifactId: Schema.Schema<string> & {
  toDXN: (reference: ArtifactId, owningSpaceId?: SpaceId) => DXN;
} = class extends Schema.String.annotations({
  description: `
  The ID of the referenced object. Formats accepted:
  - DXN (dxn:echo:@:XXXXX). DXNs can be prepended with an @ symbol for compatibility with in-text references.
  - space ID, object ID tuple (spaceID:objectID)
  - Only object ID that is assumed to be in the current space (XXXXX)
  `,
  examples: ['dxn:echo:@:XXXXX', '@dxn:echo:@:XXXXX', 'spaceID:objectID', 'XXXXX'],
}) {
  static toDXN(reference: ArtifactId, owningSpaceId?: SpaceId): DXN {
    // Allow @dxn: prefix for compatibility with in-text references.
    if (reference.startsWith('@dxn:')) {
      return DXN.parse(reference.slice(1));
    } else if (reference.startsWith('dxn:')) {
      return DXN.parse(reference);
    } else if (/^[A-Z0-9]+:[A-Z0-9]+$/.test(reference)) {
      const [spaceId, objectId] = reference.split(':');
      // This is a workaround because the current Filter API doesn't work with fully qualified Echo DXNs.
      // We check if the space ID is the same as the owning space and then use LOCAL_SPACE_TAG for local references.
      // TODO(dmaretskyi): Fix this in the Echo and Filter API to properly handle fully qualified DXNs.
      return new DXN(DXN.kind.ECHO, [spaceId === owningSpaceId ? LOCAL_SPACE_TAG : spaceId, objectId]);
    } else if (/^[A-Z0-9]+$/.test(reference)) {
      return DXN.fromLocalObjectId(reference);
    } else {
      throw new Error(`Unable to parse object reference: ${reference}`);
    }
  }
};

export type ArtifactId = Schema.Schema.Type<typeof ArtifactId>;
