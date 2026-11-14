//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import {
  type FieldValue,
  SOFTWARE_DIALECT,
  applyChanges,
  decodeBlock,
  parseDialectHeader,
  patchBlock,
  resolveBlockSchemas,
  specItems,
} from '@dxos/deus/schema';
import { Database, EID, Obj, Ref, Relation, Text } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { type Text as TextType } from '@dxos/schema';

const CORE_DIALECT = 'org.dxos.spec.core';

export class SpecItemError extends BaseError.extend('SpecItemError', 'No such spec item.') {}

export const entityId = (uri: string): string => EID.getEntityId(EID.parse(uri)) ?? uri;

export const refId = (ref: Ref.Ref<unknown>): string => entityId(ref.uri);

/** A relation's source and target ids, read from their URIs, so neither endpoint need be loaded. */
export const endpoints = (relation: Relation.Unknown): readonly [string, string] => [
  entityId(Relation.getSourceURI(relation)),
  entityId(Relation.getTargetURI(relation)),
];

/** Moves the spec into the project's specs, out of any other project's. */
export const setProject = Effect.fn(function* (spec: Spec.Spec, projectRef: Ref.Ref<Project.Project>) {
  const project = yield* Database.load(projectRef);
  if (Project.getOwner(spec)?.id === project.id) {
    return;
  }
  clearProject(spec);
  Obj.update(project, (project) => {
    project.specs.push(Ref.make(spec));
  });
});

export const clearProject = (spec: Spec.Spec): void => {
  const project = Project.getOwner(spec);
  if (project) {
    const index = project.specs.findIndex((ref) => refId(ref) === spec.id);
    if (index !== -1) {
      Obj.update(project, (project) => {
        project.specs.splice(index, 1);
      });
    }
    Obj.setParent(spec, undefined);
  }
};

export const addSpec = Effect.fn(function* ({
  project,
  ...props
}: Spec.MakeProps & { project?: Ref.Ref<Project.Project> }) {
  const spec = yield* Database.add(Spec.make(props));
  if (project) {
    yield* setProject(spec, project);
  }
  return spec;
});

/** The block `item` names in the spec's text, by key or label, with what it reads. */
export const readItem = (spec: Spec.Spec, text: TextType.Text, item: string) => {
  const { content } = text;
  const schemas = resolveBlockSchemas(content, {
    dialects: [...new Set([CORE_DIALECT, SOFTWARE_DIALECT, ...parseDialectHeader(content).extends, ...spec.dialects])],
  });
  const found = specItems(content, schemas).find(
    (candidate) => !candidate.entry && (candidate.key === item || candidate.label === item),
  );
  const schema = found && schemas.get(found.kind);
  return found && schema ? { item: found, schema, value: decodeBlock(content, found.block, schema) } : undefined;
};

/** Writes one field of the block `item` names; fails when the spec states no such block. */
export const setItemField = Effect.fn(function* (
  spec: Spec.Spec,
  text: TextType.Text,
  item: string,
  field: string,
  value: FieldValue,
) {
  const read = readItem(spec, text, item);
  if (!read) {
    return yield* Effect.fail(new SpecItemError({ message: `"${spec.name}" has no block ${item}.` }));
  }
  const content = applyChanges(
    text.content,
    patchBlock(text.content, read.item.block, read.schema, {
      ...read.value,
      fields: { ...read.value.fields, [field]: value },
    }),
  );
  Obj.update(text, (text) => {
    Text.update(text, 'content', content);
  });
  return read;
});
