//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useCallback, useMemo, useState } from 'react';

import { Operation, Instructions, Trigger } from '@dxos/compute';
import { DXN, type Database, Entity, Filter, Obj, Query, Ref, Scope, Type } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { ToggleGroup, ToggleGroupItem, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap, RefField } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Routine } from '#types';

import { runnableInstructions, runnableOperation } from '../../util';
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
  routine: Routine.Routine;
  /** Render the form for display only (e.g. an enabled routine, locked until disabled). */
  readonly?: boolean;
  /** Commit the edit session; when set, the form renders a Save/Cancel action row (the companion's create flow). */
  onSave?: () => void;
  /** Discard the edit session. */
  onCancel?: () => void;
};

/**
 * Composite routine form: the general fields (name + description) are the outer {@link Form},
 * with the Actions and Triggers sections rendered as sub-forms inside its content:
 * - Actions — Operation/Routine variants chosen via a button group (single action; `runnable` isn't an array).
 * - Triggers — the {@link TriggerEditor}.
 *
 * The sub-forms read and autosave the routine's owned instructions and primary trigger directly off the
 * `routine` graph (live editing); `readonly` displays them without edit affordances. The optional Save/Cancel
 * row is used only by the companion's create-from-template flow.
 */
export const RoutineForm = ({ db, routine, readonly = false, onSave, onCancel }: RoutineFormProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [auto, updateAuto] = useObject(routine);
  const trigger = usePrimaryTrigger(routine);

  // Read once per routine identity; the uncontrolled form owns edits after mount.
  const defaultValues = useMemo<Partial<GeneralForm>>(
    () => ({ name: auto.name, description: auto.description }),
    [routine],
  );
  const handleValuesChanged = useCallback(
    (values: Partial<GeneralForm>) => {
      updateAuto((routine) => {
        routine.name = values.name;
        routine.description = values.description;
      });
    },
    [updateAuto],
  );

  return (
    <Form.Root
      schema={GeneralForm}
      readonly={readonly}
      defaultValues={defaultValues}
      onValuesChanged={handleValuesChanged}
      onSave={onSave}
      onCancel={onCancel}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet />

          <Section title={t('actions.title')}>
            <ActionEditor db={db} routine={routine} readonly={readonly} />
          </Section>

          <Section title={t('triggers.title')}>
            <TriggerEditor db={db} routine={routine} trigger={trigger} readonly={readonly} />
          </Section>

          {/* Save/Cancel for the edit session (the sub-forms autosave to the in-memory clones as they change). */}
          {onSave && <Form.Actions />}
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

/**
 * Single action: an Operation ref (written to the routine's `runnable`) or an owned Instructions edited inline.
 * The instructions object and `runnable` wiring are established on save (see `saveRoutine`), not on mount — the
 * editor reads/edits the live owned instructions off the routine's `runnable`.
 */
const ActionEditor = ({
  db,
  routine,
  readonly,
}: {
  db: Database.Database;
  routine: Routine.Routine;
  readonly?: boolean;
}) => {
  const [auto, updateAuto] = useObject(routine);
  const operations = useOperations(db);
  // The action is read off `runnable`: an Instructions runnable is an instructions action, an Operation
  // runnable is an operation action.
  const operationRunnable = runnableOperation(auto.runnable);
  const ownedInstructions = runnableInstructions(auto.runnable);
  const isOperationAction = operationRunnable != null;
  const [kind, setKind] = useState<ActionKind>(isOperationAction ? 'operation' : 'instructions');

  const handleOperationChange = useCallback(
    (operation?: Ref.Ref<Operation.PersistentOperation>) => {
      updateAuto((routine) => {
        routine.runnable = operation;
      });
    },
    [updateAuto],
  );

  const handleKindChange = useCallback(
    (next: ActionKind) => {
      setKind(next);
      updateAuto((routine) => {
        if (next === 'operation') {
          // Drop the instructions runnable; the operation is chosen via the picker below. `saveRoutine` deletes
          // the now-orphaned instructions when persisting an operation action.
          routine.runnable = undefined;
        } else if (!runnableInstructions(routine.runnable)) {
          // Seed an owned instructions as the runnable (the executing operation is the implicit RunInstructions).
          const instructions = Instructions.make({});
          Obj.setParent(instructions, routine);
          routine.runnable = Ref.make(instructions);
        }
      });
    },
    [updateAuto],
  );

  return (
    <div role='none' className='flex flex-col'>
      {!readonly && <ActionKindToggle value={kind} onChange={handleKindChange} />}
      {kind === 'operation' ? (
        <OperationEditor
          db={db}
          operations={operations}
          operation={operationRunnable}
          onChange={handleOperationChange}
          readonly={readonly}
        />
      ) : ownedInstructions ? (
        <InstructionsEditor db={db} instructions={ownedInstructions} readonly={readonly} />
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
  readonly,
}: {
  db: Database.Database;
  operations: ReturnType<typeof useOperations>;
  operation?: Ref.Ref<Operation.PersistentOperation>;
  onChange?: (operation?: Ref.Ref<Operation.PersistentOperation>) => void;
  readonly?: boolean;
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
      readonly={readonly}
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

/** Subscribe to the routine and derive its primary (first) trigger. */
const usePrimaryTrigger = (routine: Routine.Routine): Trigger.Trigger | undefined => {
  const [snapshot] = useObject(routine);
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
