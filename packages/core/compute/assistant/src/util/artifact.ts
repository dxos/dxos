//
// Copyright 2025 DXOS.org
//

import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as SchemaTransformation from 'effect/SchemaTransformation';

import { PromptDefinition } from '@dxos/ai';
import { Database, type Error as EchoError, Obj, Ref, type Type } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { EID, EntityId, SpaceId } from '@dxos/keys';
import { trim } from '@dxos/util';

/**
 * @deprecated
 */
export const createArtifactElement = (id: EntityId) => `<artifact id=${id} />`;

/**
 * States the object reference format once in the system prompt; every ref parameter of every tool
 * points here instead of carrying the format in its own JSON Schema.
 */
export const ObjectReferenceDefinition = PromptDefinition.make({
  id: 'org.dxos.assistant.object-reference',
  title: 'Object reference',
  text: trim`
    A parameter described as an object reference takes the object's URI exactly as it appears in Context Objects
    or in a tool result, e.g. echo://<spaceId>/<objectId>.
    Also accepted: <spaceId>:<objectId>; a bare <objectId> for an object in the current space; and
    dxn:<typename>:<version> for a type that exists in the registry. A leading @ is ignored.
  `,
});

/**
 * What a ref parameter's JSON Schema says about its format.
 */
const OBJECT_REFERENCE_HINT = `An object reference (see "${ObjectReferenceDefinition.title}" in Definitions).`;

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
  ) => Effect.Effect<Type.InstanceType<S>, EchoError.EntityNotFoundError, Database.Service>;
} = class extends Schema.String.annotate({ description: OBJECT_REFERENCE_HINT }) {
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
  ): Effect.Effect<Type.InstanceType<S>, EchoError.EntityNotFoundError, Database.Service> {
    const uri = ArtifactURI.toEchoURI(ref);
    return Database.resolve(Ref.fromURI(uri), schema);
  }
};

type ArtifactURI = Schema.Schema.Type<typeof ArtifactURI>;

const refFromUri = SchemaTransformation.transform({
  decode: (fromA: string) => {
    const eid = ArtifactURI.toEchoURI(fromA);
    // Normalize to local form: strip any space authority so the ref resolves within the current
    // space context. The AI commonly sends echo://SPACE/ENTITY format (mirroring what it sees in
    // the database context), but cross-space resolution is not yet supported and the space ID
    // encoded in the URI is always the current space anyway.
    return EncodedReference.fromURI(EID.toLocal(eid));
  },
  encode: (toI: EncodedReference) => EncodedReference.toURI(toI),
});

/**
 * Schema that decodes ECHO reference object from an LLM-friendly input.
 */
export const RefFromLLM = ArtifactURI.pipe(Schema.decodeTo(Ref.Ref(Obj.Unknown), refFromUri)).annotate(
  PromptDefinition.annotations(ObjectReferenceDefinition),
);

/**
 * {@link RefFromLLM} advertised with the parameter's own description ahead of the format hint.
 *
 * The description goes on the encoded string because the model is shown the encoded side's JSON Schema;
 * an annotation on the decoded `Ref` never reaches it.
 */
export const refFromLLM = (description: string | undefined) =>
  description === undefined
    ? RefFromLLM
    : Schema.String.annotate({ description: `${description}\n${OBJECT_REFERENCE_HINT}` })
        .pipe(Schema.decodeTo(Ref.Ref(Obj.Unknown), refFromUri))
        .annotate(PromptDefinition.annotations(ObjectReferenceDefinition));
