//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { SpaceProperties } from '@dxos/client-protocol/types';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Annotation, Collection, DXN, Feed, Obj, Ref, Tag, Type } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { ArchivableAnnotation } from '@dxos/schema';

import { rootCollectionRule } from '../capabilities/default-parent.ts';

export class TestObject extends Type.makeObject<TestObject>(DXN.make('com.example.type.testObject', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
  }).pipe(Annotation.UserType.set()),
) {}

export class TestArchivable extends Type.makeObject<TestArchivable>(
  DXN.make('com.example.type.testArchivable', '0.1.0'),
)(Schema.Struct({ name: Schema.optional(Schema.String) }).pipe(ArchivableAnnotation.set(true))) {}

export class TestContainer extends Type.makeObject<TestContainer>(DXN.make('com.example.type.testContainer', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    items: Schema.Array(Ref.Ref(TestObject)),
  }).pipe(Annotation.UserType.set()),
) {}

export const TestRelation = Type.makeRelation(DXN.make('com.example.relation.testRelation', '0.1.0'))({
  source: Obj.Unknown,
  target: Obj.Unknown,
})(Schema.Struct({ id: Obj.ID, note: Schema.optional(Schema.String) }));

/** The verbs return `unknown` (any ECHO shape), so the assertions decode the fields they read. */
export const decodeNamed = Schema.decodeUnknownSync(Schema.Struct({ name: Schema.optional(Schema.String) }));

const decodeRow = Schema.decodeUnknownSync(Schema.Struct({ label: Schema.optional(Schema.String) }));

export const labelOf = (row: unknown): string => decodeRow(row).label ?? '';

export const decodeTypeRow = Schema.decodeUnknownSync(
  Schema.Struct({ typename: Schema.String, jsonSchema: Schema.optional(Schema.Unknown) }),
);

/**
 * Compare by entity id: a same-space ref stores a local EID (`echo:/<id>`) while `Obj.getURI`
 * returns the fully-qualified form.
 */
export const taggedIds = (object: Obj.Any): (string | undefined)[] =>
  Obj.getMeta(object).tags.map((ref) => EID.getEntityId(EID.parse(ref.uri)));

/** The host's capability manager, carrying the default-parent rule plugin-space contributes. */
const makeCapabilities = () => {
  const manager = CapabilityManager.make({ registry: Registry.make() });
  manager.contribute({ module: 'test', interface: AppCapabilities.DefaultParent, implementation: rootCollectionRule });
  return manager;
};

/** A layer carrying only the handlers the suite under test invokes. */
export const makeTestLayer = (...handlers: Operation.WithHandler<Operation.Definition.Any>[]) =>
  AssistantTestLayer({
    extraServices: Layer.succeed(Capability.Service, makeCapabilities()),
    operationHandlers: OperationHandlerSet.make(...handlers),
    types: [
      Skill.Skill,
      Feed.Feed,
      Tag.Tag,
      Collection.Collection,
      SpaceProperties,
      TestObject,
      TestArchivable,
      TestContainer,
      TestRelation,
    ],
    disableLlmMemoization: true,
  });
