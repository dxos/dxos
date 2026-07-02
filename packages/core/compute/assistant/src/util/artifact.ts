//
// Copyright 2025 DXOS.org
//

import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, type Err, Obj, Ref, type Type } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { EID, EntityId, SpaceId } from '@dxos/keys';
import { trim } from '@dxos/util';

/**
 * @deprecated
 */
export const createArtifactElement = (id: EntityId) => `<artifact id=${id} />`;

/**
 * A model-friendly way to reference an object.
 * Supports vairous formats that will be normalized to a DXN.
 *
 * @internal
 */
const ArtifactURI: Schema.Schema<string> & {
  toEchoURI: (reference: ArtifactURI, owningSpaceId?: SpaceId) => EID.EID;
  resolve: <S extends Type.AnyEntity>(
    schema: S,
    ref: ArtifactURI,
  ) => Effect.Effect<Type.InstanceType<S>, Err.EntityNotFoundError, Database.Service>;
} = class extends Schema.String.annotations({
  // TODO(dmaretskyi): This section gets overriden.
  description: trim`
    The URI of the referenced object. Protocols accepted:
    - echo://01KG7R1ZXWFMWQ4DA1Q6TN1DG4. 
    - space ID, object ID tuple (spaceID:objectID)
    - Only object ID that is assumed to be in the current space (01KG7R1ZXWFMWQ4DA1Q6TN1DG4)
    - dxn:org.dxos.type.calendar:0.1.0 -- named entity from the registry. Absoutely make sure it actually exists in the registry.

    URIs can be prepended with an @ symbol for compatibility with in-text references.
  `,
  examples: [
    'echo://01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
    '@echo://01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
    'BM3FSHFOMJCHCG5QW7JTVKGYABD2GAA7G:01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
    '01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
    'dxn:org.dxos.type.calendar:0.1.0',
    '@dxn:org.dxos.type.calendar:0.1.0',
  ],
}) {
  static toEchoURI(reference: ArtifactURI, owningSpaceId?: SpaceId): EID.EID {
    // Allow @ prefix for compatibility with in-text references.
    const stripped = reference.startsWith('@') ? reference.slice(1) : reference;
    if (stripped.startsWith('echo:') || stripped.startsWith('dxn:')) {
      return EID.parse(stripped);
    } else if (stripped.includes(':')) {
      const [spaceId, objectId] = stripped.split(':');
      if (!SpaceId.isValid(spaceId) || !EntityId.isValid(objectId)) {
        throw new Error(`Unable to parse object reference: ${reference}`);
      }
      // This is a workaround because the current Filter API doesn't work with fully qualified Echo URIs.
      // We check if the space ID is the same as the owning space and then use LOCAL_SPACE_TAG for local references.
      // TODO(dmaretskyi): Fix this in the Echo and Filter API to properly handle fully qualified URIs.
      return spaceId === owningSpaceId
        ? EID.make({ entityId: objectId })
        : EID.make({ spaceId: spaceId, entityId: objectId });
    } else if (EntityId.isValid(stripped)) {
      return EID.make({ entityId: stripped });
    } else {
      throw new Error(`Unable to parse object reference: ${reference}`);
    }
  }

  /**
   * Resolves an artifact ID to an object.
   */
  static resolve<S extends Type.AnyEntity>(
    schema: S,
    ref: ArtifactURI,
  ): Effect.Effect<Type.InstanceType<S>, Err.EntityNotFoundError, Database.Service> {
    const uri = ArtifactURI.toEchoURI(ref);
    return Database.resolve(Ref.fromURI(uri), schema);
  }
};

type ArtifactURI = Schema.Schema.Type<typeof ArtifactURI>;

/**
 * Schema that decodes ECHO reference object from an LLM-friendly input.
 */
export const RefFromLLM = Schema.transform(ArtifactURI, Ref.Ref(Obj.Unknown), {
  decode: (fromA) => {
    const eid = ArtifactURI.toEchoURI(fromA);
    // Normalize to local form: strip any space authority so the ref resolves within the current
    // space context. The AI commonly sends echo://SPACE/ENTITY format (mirroring what it sees in
    // the database context), but cross-space resolution is not yet supported and the space ID
    // encoded in the URI is always the current space anyway.
    return EncodedReference.fromURI(EID.toLocal(eid));
  },
  encode: (toI) => EncodedReference.toURI(toI),
  strict: false,
}).annotations({
  description: ArtifactURI.ast.annotations.description as string,
});
