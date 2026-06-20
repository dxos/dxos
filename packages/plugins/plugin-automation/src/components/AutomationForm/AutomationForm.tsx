//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Operation, Routine, Trigger } from '@dxos/compute';
import { DXN, type Database, Filter, Obj, Query, Ref, Scope, Type } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { ToggleGroup, ToggleGroupItem, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap, RefField } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Automation } from '#types';

import { TriggerEditor } from '../TriggerEditor';

//
// Main (general) form — the outer form; actions and triggers are sub-forms within its content.
//

// Pick the editable general fields from the Automation schema rather than redeclaring them.
const GeneralForm = Type.getSchema(Automation.Automation).pipe(Schema.pick('name', 'description'));
type GeneralForm = Schema.Schema.Type<typeof GeneralForm>;

export type AutomationFormProps = {
  db: Database.Database;
  automation: Automation.Automation;
};

/**
 * Composite automation form: the general fields (name + description) are the outer {@link Form},
 * with the Actions and Triggers sections rendered as sub-forms inside its content:
 * - Actions — Operation/Routine variants chosen via a button group (single action; `runnable` isn't an array).
 * - Triggers — the {@link TriggerEditor}.
 */
export const AutomationForm = ({ db, automation }: AutomationFormProps) => {
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
            <ActionEditor db={db} automation={automation} />
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

const ActionKinds = ['routine', 'operation'] as const;
type ActionKind = (typeof ActionKinds)[number];
const isActionKind = (value: string): value is ActionKind => (ActionKinds as readonly string[]).includes(value);

/** Single action: an Operation ref (written to `automation.runnable`) or an owned Routine edited inline. */
const ActionEditor = ({ db, automation }: { db: Database.Database; automation: Automation.Automation }) => {
  const [auto, updateAuto] = useObject(automation);
  const operations = useOperations(db);
  const ownedRoutine = useOwnedRoutine(db, automation);
  const runnableTarget = auto.runnable?.target;
  // Default to a routine action unless an operation is already bound.
  const [kind, setKind] = useState<ActionKind>(
    Obj.instanceOf(Operation.PersistentOperation, runnableTarget) ? 'operation' : 'routine',
  );

  // A routine action edits an owned Routine; create one on first use (the initial default or a toggle).
  // The ref guards the gap before `useOwnedRoutine`'s query reflects the new object, avoiding a double create.
  const createdRoutineRef = useRef(false);
  useEffect(() => {
    if (kind === 'routine' && !ownedRoutine && !createdRoutineRef.current) {
      createdRoutineRef.current = true;
      const routine = db.add(Routine.make({ name: auto.name }));
      Obj.setParent(routine, automation);
    }
  }, [kind, ownedRoutine, db, automation, auto.name]);

  const handleOperationChange = useCallback(
    (operation?: Ref.Ref<Operation.PersistentOperation>) => {
      updateAuto((automation) => {
        automation.runnable = operation;
      });
    },
    [updateAuto],
  );

  return (
    <div role='none' className='flex flex-col gap-2'>
      <ActionKindToggle value={kind} onChange={setKind} />
      {kind === 'operation' ? (
        <OperationEditor
          db={db}
          operations={operations}
          operation={Obj.instanceOf(Operation.PersistentOperation, runnableTarget) ? auto.runnable : undefined}
          onChange={handleOperationChange}
        />
      ) : ownedRoutine ? (
        <RoutineEditor routine={ownedRoutine} />
      ) : null}
    </div>
  );
};

const ActionKindToggle = ({ value, onChange }: { value: ActionKind; onChange: (kind: ActionKind) => void }) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <ToggleGroup type='single' value={value} onValueChange={(next) => isActionKind(next) && onChange(next)}>
      <ToggleGroupItem value='routine'>{t('action-kind.routine.label')}</ToggleGroupItem>
      <ToggleGroupItem value='operation'>{t('action-kind.operation.label')}</ToggleGroupItem>
    </ToggleGroup>
  );
};

const OperationActionForm = Schema.Struct({
  operation: Ref.Ref(Operation.PersistentOperation).pipe(Schema.annotations({ title: 'Operation' }), Schema.optional),
});
type OperationActionValues = Schema.Schema.Type<typeof OperationActionForm>;

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
    () => ({ operation: (props) => <RefField {...props} db={db} useResults={() => operations} /> }),
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

const ROUTINE_SCHEMA = Type.getSchema(Routine.Routine);

// Owned-routine action fields surfaced for editing.
const ROUTINE_FIELDS = new Set(['instructions', 'blueprints']);

/**
 * Sub-form: edits the owned Routine's `instructions` (Markdown) and `blueprints` in place. A bare
 * Form.Root + FieldSet (no Viewport) keeps these fields left-aligned with the sibling general/action
 * forms; the rendered fields are written back so blueprint selections persist to the routine.
 */
const RoutineEditor = ({ routine }: { routine: Routine.Routine }) => {
  const db = Obj.getDatabase(routine);
  const defaultValues = useMemo(() => Obj.getSnapshot(routine), [routine]);
  const handleValuesChanged = useCallback(
    (values: Partial<Routine.Routine>, { isValid }: { isValid: boolean }) => {
      // Skip while invalid (e.g. an empty ref slot just added by the array field) so a partial blueprint
      // selection isn't persisted; the write lands once a blueprint is chosen.
      if (!isValid) {
        return;
      }

      Obj.update(routine, (routine) => {
        if (values.instructions) {
          routine.instructions = values.instructions;
        }
        routine.blueprints = [...(values.blueprints ?? [])];
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
      onValuesChanged={handleValuesChanged}
    >
      <Form.FieldSet filter={(props) => props.filter((prop) => ROUTINE_FIELDS.has(prop.name.toString()))} />
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

/** The Routine owned by (parented to) this automation, used for the inline routine action. */
const useOwnedRoutine = (db: Database.Database, automation: Automation.Automation): Routine.Routine | undefined => {
  const routines = useQuery(db, Query.select(Filter.type(Routine.Routine)).from(Scope.space()));
  return useMemo(
    () => routines.find((routine) => Obj.getParent(routine)?.id === automation.id),
    [routines, automation],
  );
};

/** Subscribe to the automation and derive its primary (first) trigger. */
const usePrimaryTrigger = (automation: Automation.Automation): Trigger.Trigger | undefined => {
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
