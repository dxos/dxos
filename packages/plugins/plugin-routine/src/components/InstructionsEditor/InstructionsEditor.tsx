//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useMemo } from 'react';

import { Instructions, Skill } from '@dxos/compute';
import { type Database, Entity, Obj, Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/Annotation';
import { Form } from '@dxos/react-ui-form';

const INSTRUCTIONS_SCHEMA = Type.getSchema(Instructions.Instructions);

// Owned-routine action fields surfaced for editing — the prompt text and the agent's `skills`. The
// context `objects` are deliberately not editable here: the owning subject (a project's artifacts, a
// chat's bindings) is what puts objects in context, so a second, divergent list would confuse.
const INSTRUCTIONS_FIELDS = new Set(['text', 'skills']);

export type InstructionsEditorProps = {
  db?: Database.Database; // TODO(burdon): Should not be optional if instructions are not.
  instructions: Instructions.Instructions;
  readonly?: boolean;
};

/**
 * Sub-form: edits the owned Instructions in place — its `text` (Markdown) and `skills`, both fields of
 * the Instructions schema. A bare Form.Root + FieldSet (no Viewport) keeps these fields left-aligned
 * with the sibling general/action forms; the rendered fields are written back so selections persist to
 * the instructions.
 */
export const InstructionsEditor = ({ db: dbProp, instructions, readonly }: InstructionsEditorProps) => {
  // A draft routine is not yet attached to a database, so fall back to the explicit `db` for ref queries.
  const db = dbProp ?? Obj.getDatabase(instructions);

  const defaultValues = useMemo<Partial<Instructions.Instructions>>(
    () => ({ ...Obj.getSnapshot(instructions) }),
    [instructions],
  );

  const handleValuesChanged = useCallback(
    (values: Partial<Instructions.Instructions>, { isValid }: { isValid: boolean }) => {
      // Skip while invalid (e.g. an empty ref slot just added by the skills array field) so a partial
      // selection isn't persisted; the write lands once the slot is filled.
      if (!isValid) {
        return;
      }

      Obj.update(instructions, (instructions) => {
        if (values.text) {
          instructions.text = values.text;
        }
        instructions.skills = [...(values.skills ?? [])];
      });
    },
    [instructions],
  );

  return (
    <Form.Root
      key={instructions.id}
      schema={INSTRUCTIONS_SCHEMA}
      db={db}
      readonly={readonly}
      defaultValues={defaultValues}
      getOptions={getRefOptions}
      onValuesChanged={handleValuesChanged}
    >
      <Form.FieldSet filter={(props) => props.filter((prop) => INSTRUCTIONS_FIELDS.has(prop.name.toString()))} />
    </Form.Root>
  );
};

// System objects (e.g. SpaceProperties) carry `HiddenAnnotation` on their type; they are infrastructure,
// not user content, so they are excluded from the context picker.
const isSystemObject = (object: Entity.Any): boolean => {
  if (!Obj.isObject(object)) {
    return false;
  }
  const typeEntity = Obj.getType(object);
  if (!typeEntity) {
    return false;
  }

  return HiddenAnnotation.get(Type.getSchema(typeEntity)).pipe(Option.getOrElse(() => false));
};

// Ref-picker options shared by the routine form's skill and object fields: surface a secondary line
// per candidate — a Skill's registry key, otherwise the object's typename — and sort by label, so the
// pickers present refs consistently. Falls back to the type placeholder (then URI) for unlabelled objects,
// matching the default RefField; system objects are excluded.
const getRefOptions = (
  results: Entity.Any[],
  { getTypePlaceholder }: { getTypePlaceholder?: (typename: string) => string } = {},
): { id: string; label: string; description?: string }[] =>
  results
    .filter((entity) => !isSystemObject(entity))
    .map((entity) => {
      const id = Entity.getURI(entity, { prefer: 'named' });
      const typename = Entity.getTypename(entity);
      const label = Entity.getLabel(entity) ?? (typename ? getTypePlaceholder?.(typename) : undefined) ?? id;
      const description = Obj.instanceOf(Skill.Skill, entity) ? Obj.getMeta(entity).key : typename;
      return { id, label, description };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
