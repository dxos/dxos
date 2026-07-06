//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useCallback, useMemo } from 'react';

import { Instructions, Operation, Trigger } from '@dxos/compute';
import { type Database, DXN, Entity, Filter, Obj, Query, Ref, Scope, Type } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { ToggleGroup, ToggleGroupItem, composable, composableProps, useTranslation } from '@dxos/react-ui';
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
 * - Actions — Operation/Instructions variants chosen via a button group (single action; `spec` isn't an array).
 * - Triggers — the {@link TriggerEditor}.
 *
 * The sub-forms read and autosave the routine's owned instructions and primary trigger directly off the
 * `routine` graph (live editing); `readonly` displays them without edit affordances. The optional Save/Cancel
 * row is used only by the companion's create-from-template flow.
 *
 * Created with `composable()` so it carries the COMPOSABLE marker and can be the child of
 * `Panel.Content asChild` (forwards ref and merges layout props onto the scroll viewport).
 */
export const RoutineForm = composable<HTMLDivElement, RoutineFormProps>(
  ({ db, routine, readonly = false, onSave, onCancel, ...props }, forwardedRef) => {
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

    // TODO(burdon): Could this be rewritten a single form with custom fields?
    return (
      <Form.Root
        schema={GeneralForm}
        readonly={readonly}
        defaultValues={defaultValues}
        onValuesChanged={handleValuesChanged}
        onSave={onSave}
        onCancel={onCancel}
      >
        <Form.Viewport scroll {...composableProps(props)} ref={forwardedRef}>
          <Form.Content>
            <Form.FieldSet />

            <Section title={t('actions.title')}>
              <ActionEditor db={db} routine={routine} readonly={readonly} />
            </Section>

            {/* TODO(burdon): Support multiple triggers. */}
            <Section title={t('triggers.title')}>
              <TriggerEditor db={db} routine={routine} trigger={trigger} readonly={readonly} />
            </Section>

            {/* Save/Cancel for the edit session (the sub-forms autosave to the in-memory clones as they change). */}
            {onSave && <Form.Actions />}
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    );
  },
);

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

/**
 * Single action: an Operation (the routine's `spec.runnable`) or an owned Instructions edited inline. The
 * action kind is derived from the routine's `spec` — an absent spec means "operation, none chosen yet" (a
 * scaffolded routine always carries an instructions spec, so the only way to clear it is switching to an
 * operation). `Routine.make` establishes the owned-instructions wiring when the routine is scaffolded.
 */
const ActionEditor = ({
  db,
  routine: routineProp,
  readonly,
}: {
  db: Database.Database;
  routine: Routine.Routine;
  readonly?: boolean;
}) => {
  const operations = useOperations(db);
  const [routine, updateRoutine] = useObject(routineProp);

  // Classification is read off `spec.kind` (no dereference); the owned instructions object is then resolved in
  // place to hand to the editor (an owned ref is always locally resolvable, and the parent `useObject` re-renders
  // this when `spec` changes). An absent spec means "runnable, none chosen yet" — a scaffolded routine always
  // carries an instructions spec, so the only way to clear it is switching to a runnable action.
  const kind = routine.spec?.kind ?? 'runnable';
  const operationRef = Routine.runnableRef(routine);
  const instructions = Routine.instructionsRef(routine)?.target;

  const handleOperationChange = useCallback(
    (operation?: Ref.Ref<Operation.PersistentOperation>) => {
      updateRoutine((routine) => {
        routine.spec = operation ? { kind: 'runnable', runnable: operation } : undefined;
      });
      // Keep the owned trigger's `function`/`input` in sync with the new action.
      Routine.wireTriggers(routineProp);
    },
    [updateRoutine, routineProp],
  );

  const handleKindChange = useCallback(
    (next: Routine.Kind) => {
      updateRoutine((routine) => {
        if (next === 'runnable') {
          // Switch to an operation action; the operation is chosen via the picker below. A previously-owned
          // instructions stays parented to the routine (cascade-deleted with it) but is no longer the action.
          routine.spec = undefined;
        } else if (routine.spec?.kind !== 'instructions') {
          // Seed an owned instructions action (the executing operation is the implicit RunInstructions).
          const instructions = Instructions.make({});
          Obj.setParent(instructions, routine);
          routine.spec = { kind: 'instructions', instructions: Ref.make(instructions) };
        }
      });
      // Re-wire the owned trigger to dispatch the new action (RunInstructions vs the operation).
      Routine.wireTriggers(routineProp);
    },
    [updateRoutine, routineProp],
  );

  return (
    <div role='none' className='flex flex-col'>
      {!readonly && <ActionKindToggle value={kind} onChange={handleKindChange} />}
      {kind === 'runnable' ? (
        <OperationEditor
          db={db}
          operations={operations}
          operation={operationRef}
          onChange={handleOperationChange}
          readonly={readonly}
        />
      ) : instructions ? (
        <InstructionsEditor db={db} instructions={instructions} readonly={readonly} />
      ) : null}
    </div>
  );
};

const ActionKindToggle = ({ value, onChange }: { value: Routine.Kind; onChange: (kind: Routine.Kind) => void }) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    // `type='single'` emits `''` when the selected item is clicked again (toggled off); ignore that and any
    // other non-kind value so it can't fall through and overwrite the current action.
    <ToggleGroup
      type='single'
      value={value}
      onValueChange={(next) => {
        if (next === 'instructions' || next === 'runnable') {
          onChange(next);
        }
      }}
    >
      <ToggleGroupItem value='instructions'>{t('action-kind.instructions.label')}</ToggleGroupItem>
      <ToggleGroupItem value='runnable'>{t('action-kind.operation.label')}</ToggleGroupItem>
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
