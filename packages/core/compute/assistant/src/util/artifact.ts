//
// Copyright 2025 DXOS.org
//

import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, type Err, Obj, Ref, type Type } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { EchoURI, ObjectId, SpaceId } from '@dxos/keys';
import { trim } from '@dxos/util';

/**
 * @deprecated
 */
export const createArtifactElement = (id: ObjectId) => `<artifact id=${id} />`;

/**
 * A model-friendly way to reference an object.
 * Supports vairous formats that will be normalized to a DXN.
 *
 * @deprecated Use `Ref.Ref(XXX)` instead.
 */
// TODO(burdon): Rename RefFromLLM?
export const ArtifactId: Schema.Schema<string> & {
  toEchoURI: (reference: ArtifactId, owningSpaceId?: SpaceId) => EchoURI.EchoURI;
  resolve: <S extends Type.AnyEntity>(
    schema: S,
    ref: ArtifactId,
  ) => Effect.Effect<Schema.Schema.Type<S>, Err.ObjectNotFoundError, Database.Service>;
} = class extends Schema.String.annotations({
  // TODO(dmaretskyi): This section gets overriden.
  description: trim`
    The ID of the referenced object. Formats accepted:
    - DXN (dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4). DXNs can be prepended with an @ symbol for compatibility with in-text references.
    - space ID, object ID tuple (spaceID:objectID)
    - Only object ID that is assumed to be in the current space (01KG7R1ZXWFMWQ4DA1Q6TN1DG4)
  `,
  examples: [
    'dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
    '@dxn:echo:@:01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
    'BM3FSHFOMJCHCG5QW7JTVKGYABD2GAA7G:01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
    '01KG7R1ZXWFMWQ4DA1Q6TN1DG4',
  ],
}) {
  static toEchoURI(reference: ArtifactId, owningSpaceId?: SpaceId): EchoURI.EchoURI {
    // Allow @ prefix for compatibility with in-text references.
    const stripped = reference.startsWith('@') ? reference.slice(1) : reference;
    if (stripped.startsWith('echo:') || stripped.startsWith('dxn:')) {
      return EchoURI.parse(stripped);
    } else if (stripped.includes(':')) {
      const [spaceId, objectId] = stripped.split(':');
      if (!SpaceId.isValid(spaceId) || !ObjectId.isValid(objectId)) {
        throw new Error(`Unable to parse object reference: ${reference}`);
      }
      // This is a workaround because the current Filter API doesn't work with fully qualified Echo URIs.
      // We check if the space ID is the same as the owning space and then use LOCAL_SPACE_TAG for local references.
      // TODO(dmaretskyi): Fix this in the Echo and Filter API to properly handle fully qualified URIs.
      return spaceId === owningSpaceId
        ? EchoURI.make({ objectId: objectId })
        : EchoURI.make({ spaceId: spaceId, objectId: objectId });
    } else if (ObjectId.isValid(stripped)) {
      return EchoURI.make({ objectId: stripped });
    } else {
      throw new Error(`Unable to parse object reference: ${reference}`);
    }
  }

  /**
   * Resolves an artifact ID to an object.
   */
  static resolve<S extends Type.AnyEntity>(
    schema: S,
    ref: ArtifactId,
  ): Effect.Effect<Schema.Schema.Type<S>, Err.ObjectNotFoundError, Database.Service> {
    const uri = ArtifactId.toEchoURI(ref);
    return Database.resolve(Ref.fromURI(uri), schema);
  }
};

export type ArtifactId = Schema.Schema.Type<typeof ArtifactId>;

/**
 * Schema that decodes ECHO reference object from an LLM-friendly input.
 */
export const RefFromLLM = Schema.transform(ArtifactId, Ref.Ref(Obj.Unknown), {
  decode: (fromA, fromI) => EncodedReference.fromURI(ArtifactId.toEchoURI(fromA)),
  encode: (toI, toA) => EncodedReference.toURI(toI),
  strict: false,
}).annotations({
  description: ArtifactId.ast.annotations.description as string,
});
