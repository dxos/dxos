//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Operation, Instructions, Trigger } from '@dxos/compute';
import { DXN, type Database, Entity, Filter, Obj, Query, Ref, Scope, Type } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { ToggleGroup, ToggleGroupItem, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap, RefField } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Routine } from '#types';

import { InstructionsEditor } from '../InstructionsEditor';
import { TriggerEditor } from '../TriggerEditor';

//
// Main (general) form — the outer form; actions and triggers are sub-forms within its content.
//

// Pick the editable general fields from the Routine schema rather than redeclaring them.
const GeneralForm = Type.getSchema(Routine.Routine).pipe(Schema.pick('name', 'description'));
type GeneralForm = Schema.Schema.Type<typeof GeneralForm>;

export type RoutineFormProps = {
  db: Database.Database;
  automation: Routine.Routine;
  /**
   * Draft owned instructions for an automation not yet added to the database (the companion's create flow).
   * When supplied, the action editor edits it directly instead of querying for / eagerly creating one,
   * so an in-memory draft can be configured before it is persisted.
   */
  instructions?: Instructions.Instructions;
};

/**
 * Composite automation form: the general fields (name + description) are the outer {@link Form},
 * with the Actions and Triggers sections rendered as sub-forms inside its content:
 * - Actions — Operation/Routine variants chosen via a button group (single action; `runnable` isn't an array).
 * - Triggers — the {@link TriggerEditor}.
 */
export const RoutineForm = ({ db, automation, instructions }: RoutineFormProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [auto, updateAuto] = useObject(automation);
  const trigger = usePrimaryTrigger(automation);

  // Read once per automation identity; the uncontrolled form owns edits after mount.
  const defaultValues = useMemo<Partial<GeneralForm>>(
    () => ({ name: auto.name, description: auto.description }),
    [automation],
  );
  const handleValuesChanged = useCallback(
    (values: Partial<GeneralForm>) => {
      updateAuto((automation) => {
        automation.name = values.name;
        automation.description = values.description;
      });
    },
    [updateAuto],
  );

  return (
    <Form.Root schema={GeneralForm} defaultValues={defaultValues} onValuesChanged={handleValuesChanged}>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet />

          <Section title={t('actions.title')}>
            <ActionEditor db={db} automation={automation} instructions={instructions} />
          </Section>

          <Section title={t('triggers.title')}>
            <TriggerEditor db={db} automation={automation} trigger={trigger} />
          </Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

/** Lightweight labelled grouping for a sub-form (no `Settings` chrome). */
const Section = ({ title, children }: PropsWithChildren<{ title: string }>) => (
  <div role='none' className='flex flex-col mbs-4'>
    <Form.Label standalone label={title} />
    {children}
  </div>
);

//
// Actions
//

const ActionKinds = ['instructions', 'operation'] as const;
type ActionKind = (typeof ActionKinds)[number];
const isActionKind = (value: string): value is ActionKind => (ActionKinds as readonly string[]).includes(value);

/** Single action: an Operation ref (written to `automation.runnable`) or an owned Routine edited inline. */
const ActionEditor = ({
  db,
  automation,
  instructions: draftRoutine,
}: {
  db: Database.Database;
  automation: Routine.Routine;
  instructions?: Instructions.Instructions;
}) => {
  const [auto, updateAuto] = useObject(automation);
  const operations = useOperations(db);
  // A draft (not-yet-persisted) automation supplies its owned instructions directly; otherwise resolve it by query.
  const queriedRoutine = useOwnedRoutine(db, automation);
  const ownedRoutine = draftRoutine ?? queriedRoutine;
  const runnableTarget = auto.runnable?.target;
  // Default to a instructions action unless an operation is already bound.
  const [kind, setKind] = useState<ActionKind>(
    Obj.instanceOf(Operation.PersistentOperation, runnableTarget) ? 'operation' : 'instructions',
  );

  // A instructions action edits an owned Routine; create one on first use (the initial default or a toggle).
  // The ref guards the gap before `useOwnedRoutine`'s query reflects the new object, avoiding a double create.
  // Skipped for a draft automation — it owns an in-memory instructions that is persisted on save.
  const createdRoutineRef = useRef(false);
  useEffect(() => {
    if (!draftRoutine && kind === 'instructions' && !queriedRoutine && !createdRoutineRef.current) {
      createdRoutineRef.current = true;
      const instructions = db.add(Instructions.make({ name: auto.name }));
      Obj.setParent(instructions, automation);
    }
  }, [draftRoutine, kind, queriedRoutine, db, automation, auto.name]);

  const handleOperationChange = useCallback(
    (operation?: Ref.Ref<Operation.PersistentOperation>) => {
      updateAuto((automation) => {
        automation.runnable = operation;
      });
    },
    [updateAuto],
  );

  return (
    <div role='none' className='flex flex-col'>
      <ActionKindToggle value={kind} onChange={setKind} />
      {kind === 'operation' ? (
        <OperationEditor
          db={db}
          operations={operations}
          operation={Obj.instanceOf(Operation.PersistentOperation, runnableTarget) ? auto.runnable : undefined}
          onChange={handleOperationChange}
        />
      ) : ownedRoutine ? (
        <InstructionsEditor db={db} instructions={ownedRoutine} />
      ) : null}
    </div>
  );
};

const ActionKindToggle = ({ value, onChange }: { value: ActionKind; onChange: (kind: ActionKind) => void }) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <ToggleGroup type='single' value={value} onValueChange={(next) => isActionKind(next) && onChange(next)}>
      <ToggleGroupItem value='instructions'>{t('action-kind.instructions.label')}</ToggleGroupItem>
      <ToggleGroupItem value='operation'>{t('action-kind.operation.label')}</ToggleGroupItem>
    </ToggleGroup>
  );
};

const OperationActionForm = Schema.Struct({
  operation: Ref.Ref(Operation.PersistentOperation).pipe(Schema.annotations({ title: 'Operation' }), Schema.optional),
});
type OperationActionValues = Schema.Schema.Type<typeof OperationActionForm>;

// Operation picker options: surface each operation's registry key (plugin/id) as the option's secondary
// line and sort by name. The `id` derivation mirrors the RefField default so a selected operation ref
// still matches its option.
const getOperationOptions = (results: Entity.Any[]): { id: string; label: string; description?: string }[] =>
  results
    // Hide internal operations: only operations annotated visible are user-bindable as trigger actions.
    .filter((operation) => !Obj.instanceOf(Operation.PersistentOperation, operation) || Operation.isVisible(operation))
    .map((operation) => {
      const id = Entity.getURI(operation, { prefer: 'named' });
      const name = Entity.getLabel(operation) ?? id;
      const key = Obj.instanceOf(Operation.PersistentOperation, operation) ? Operation.getKey(operation) : undefined;
      return { id, label: name, description: key };
    })
    .sort((left, right) => left.label.localeCompare(right.label));

/** Sub-form: ref picker for an Operation. Draws options from the queried operation set (space + registry). */
const OperationEditor = ({
  db,
  operations,
  operation,
  onChange,
}: {
  db: Database.Database;
  operations: ReturnType<typeof useOperations>;
  operation?: Ref.Ref<Operation.PersistentOperation>;
  onChange?: (operation?: Ref.Ref<Operation.PersistentOperation>) => void;
}) => {
  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      operation: (props) => (
        <RefField {...props} db={db} useResults={() => operations} getOptions={getOperationOptions} />
      ),
    }),
    [db, operations],
  );
  const defaultValues = useMemo<Partial<OperationActionValues>>(() => ({ operation }), [operation]);
  const handleValuesChanged = useCallback(
    (values: Partial<OperationActionValues>) => onChange?.(values.operation),
    [onChange],
  );

  return (
    <Form.Root
      schema={OperationActionForm}
      db={db}
      defaultValues={defaultValues}
      fieldMap={fieldMap}
      onValuesChanged={handleValuesChanged}
    >
      <Form.FieldSet />
    </Form.Root>
  );
};

//
// Hooks
//

/** Operations available to bind as an action (space-resident plus registry / plugin-provided). */
const useOperations = (db: Database.Database) =>
  useQuery(
    db,
    Query.select(Filter.type(DXN.make(Type.getTypename(Operation.PersistentOperation)))).from(
      Scope.space(),
      Scope.registry(),
    ),
  );

/** The Routine owned by (parented to) this automation, used for the inline instructions action. */
const useOwnedRoutine = (db: Database.Database, automation: Routine.Routine): Instructions.Instructions | undefined => {
  const routines = useQuery(db, Query.select(Filter.type(Instructions.Instructions)).from(Scope.space()));
  return useMemo(
    () => routines.find((instructions) => Obj.getParent(instructions)?.id === automation.id),
    [routines, automation],
  );
};

/** Subscribe to the automation and derive its primary (first) trigger. */
const usePrimaryTrigger = (automation: Routine.Routine): Trigger.Trigger | undefined => {
  const [snapshot] = useObject(automation);
  return useMemo(() => {
    for (const ref of snapshot.triggers) {
      const target = ref.target;
      if (Obj.instanceOf(Trigger.Trigger, target)) {
        return target;
      }
    }
    return undefined;
  }, [snapshot.triggers]);
};
