//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useMemo } from 'react';

import { Blueprint, Routine } from '@dxos/compute';
import { type Database, Entity, Obj, Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/Annotation';
import { Form } from '@dxos/react-ui-form';

const ROUTINE_SCHEMA = Type.getSchema(Routine.Routine);

// Owned-routine action fields surfaced for editing — the prompt (`instructions`), the agent's
// `blueprints`, and the context `objects` bound to its session at run. All live on the Routine schema,
// so a single form edits them together.
const ROUTINE_FIELDS = new Set(['instructions', 'blueprints', 'objects']);

export type RoutineEditorProps = { db?: Database.Database; routine: Routine.Routine };

/**
 * Sub-form: edits the owned Routine in place — its `instructions` (Markdown), `blueprints`, and the
 * context `objects` bound to its session at run, all fields of the one Routine schema. A bare Form.Root +
 * FieldSet (no Viewport) keeps these fields left-aligned with the sibling general/action forms; the
 * rendered fields are written back so selections persist to the routine.
 */
export const RoutineEditor = ({ db: dbProp, routine }: RoutineEditorProps) => {
  // A draft routine is not yet attached to a database, so fall back to the explicit `db` for ref queries.
  const db = dbProp ?? Obj.getDatabase(routine);

  // `objects` is optional; normalize to an array so the ref-array field renders its add affordance.
  const defaultValues = useMemo<Partial<Routine.Routine>>(
    () => ({ ...Obj.getSnapshot(routine), objects: routine.objects ? [...routine.objects] : [] }),
    [routine],
  );

  const handleValuesChanged = useCallback(
    (values: Partial<Routine.Routine>, { isValid }: { isValid: boolean }) => {
      // Skip while invalid (e.g. an empty ref slot just added by a blueprints/objects array field) so a
      // partial selection isn't persisted; the write lands once the slot is filled.
      if (!isValid) {
        return;
      }

      Obj.update(routine, (routine) => {
        if (values.instructions) {
          routine.instructions = values.instructions;
        }
        routine.blueprints = [...(values.blueprints ?? [])];
        routine.objects = [...(values.objects ?? [])];
      });
    },
    [routine],
  );

  return (
    <Form.Root
      key={routine.id}
      schema={ROUTINE_SCHEMA}
      db={db}
      defaultValues={defaultValues}
      getOptions={getRefOptions}
      onValuesChanged={handleValuesChanged}
    >
      <Form.FieldSet filter={(props) => props.filter((prop) => ROUTINE_FIELDS.has(prop.name.toString()))} />
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

// Ref-picker options shared by the routine form's blueprint and object fields: surface a secondary line
// per candidate — a Blueprint's registry key, otherwise the object's typename — and sort by label, so the
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
      const description = Obj.instanceOf(Blueprint.Blueprint, entity) ? Obj.getMeta(entity).key : typename;
      return { id, label, description };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
