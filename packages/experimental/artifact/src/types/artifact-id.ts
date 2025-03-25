//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { DXN } from '@dxos/keys';

export const ArtifactId: Schema.Schema<string> & {
  toDXN: (reference: ArtifactId) => DXN;
} = class extends Schema.String.annotations({
  description: `
  The ID of the referenced object. Formats accepted:
  - DXN (dxn:echo:@:XXXXX). DXNs can be prepended with an @ symbol for compatibility with in-text references.
  - space ID, object ID tuple (spaceID:objectID)
  - Only object ID that is assumed to be in the current space (XXXXX)
  `,
  examples: ['dxn:echo:@:XXXXX', '@dxn:echo:@:XXXXX', 'spaceID:objectID', 'XXXXX'],
}) {
  static toDXN(reference: ArtifactId): DXN {
    // Allow @dxn: prefix for compatibility with in-text references.
    if (reference.startsWith('@dxn:')) {
      return DXN.parse(reference.slice(1));
    } else if (reference.startsWith('dxn:')) {
      return DXN.parse(reference);
    } else if (/^[A-Z0-9]+:[A-Z0-9]+$/.test(reference)) {
      const [spaceId, objectId] = reference.split(':');
      return new DXN(DXN.kind.ECHO, [spaceId, objectId]);
    } else if (/^[A-Z0-9]+$/.test(reference)) {
      return DXN.fromLocalObjectId(reference);
    } else {
      throw new Error(`Unable to parse object reference: ${reference}`);
    }
  }
};
export type ArtifactId = Schema.Schema.Type<typeof ArtifactId>;
