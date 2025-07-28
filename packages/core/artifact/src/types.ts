//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { type ExecutableTool } from '@dxos/ai';
import { DXN, LOCAL_SPACE_TAG, type SpaceId } from '@dxos/keys';

/**
 * @deprecated
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

/**
 * Static artifact definition.
 * @deprecated
 */
// TODO(burdon): Convert to effect schema.
export type ArtifactDefinition = {
  // TODO(wittjosiah): Is this actually an ObjectId or should it be a uri?
  // TODO(burdon): Plugin id?
  id: string;

  /**
   * Name.
   */
  name: string;

  /**
   * Description.
   */
  description?: string;

  /**
   * Instructions for how to use the artifact.
   */
  // TODO(burdon): Reference template object.
  instructions: string;

  /**
   * Schema that describes the shape of data which matches the artifact.
   */
  schema: Schema.Schema.AnyNoContext;

  /**
   * Tools that can be used to act on data which matches the artifact.
   */
  tools: ExecutableTool[];

  // TODO(wittjosiah): Add `component` field for rendering data which matches the artifact?
  //  NOTE(burdon): I think that could just be provided separately by the plugin (since there might be multiple surface types).
};

export const defineArtifact = (definition: ArtifactDefinition): ArtifactDefinition => definition;
