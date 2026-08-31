//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useCallback, useMemo, useRef } from 'react';

import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { type Database, DXN, Entity, Filter, Obj, Query, Ref, Scope, Type } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { SchemaAST } from '@dxos/effect';
import { ToggleGroup, ToggleGroupItem, composable, composableProps, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap, type FormUpdateMeta, RefField, useFormValues } from '@dxos/react-ui-form';

import { meta } from '#meta';

import { wireTriggers } from '../../util';
import { InstructionsEditor } from '../InstructionsEditor';
import {
  TriggerForm,
  type TriggerFormInput,
  type TriggerFormValues,
  TriggerSection,
  applyTriggerValues,
  triggerFieldMap,
  triggerFormValues,
} from '../TriggerEditor';

//
// Schema — one composite form over the routine's editable surface. The general fields are picked from the
// Routine schema rather than redeclared; the action and trigger sections are discriminated unions rendered
// as nested field sets at their respective paths.
//

// Pick the editable general fields from the Routine schema rather than redeclaring them.
// `SchemaAST` rather than `mapFields`: `Type.getSchema` returns a `Codec`, which carries no field literals.
type GeneralForm = Pick<Routine.Routine, 'name' | 'description'>;
const GeneralFields = SchemaAST.pick(Type.getSchema(Routine.Routine).ast, ['name', 'description']);
// The same fields as a schema, for the root field set that renders them.
const GeneralForm = Schema.make<Schema.Codec<GeneralForm, any>>(GeneralFields);

const RunnableActionForm = Schema.Struct({
  kind: Schema.Literal('runnable'),
  operation: Ref.Ref(Operation.PersistentOperation).pipe(Schema.annotate({ title: 'Operation' }), Schema.optional),
});

const InstructionsActionForm = Schema.Struct({
  kind: Schema.Literal('instructions'),
});

// Single action: an Operation (the routine's `spec.runnable`) or an owned Instructions edited inline (the
// instructions content is not a form value — it is a separate owned object, edited by `InstructionsEditor`).
const ActionForm = Schema.Union([RunnableActionForm, InstructionsActionForm]);

type RoutineFormValues = GeneralForm & {
  readonly action?: Schema.Schema.Type<typeof ActionForm>;
  readonly trigger?: TriggerFormValues;
};

// General fields first so the form renders name/description above the action and trigger field sets.
const RoutineFormSchema = Schema.make<Schema.Codec<RoutineFormValues, any>>(
  SchemaAST.assignFields(
    GeneralFields,
    Schema.Struct({
      action: Schema.optional(ActionForm),
      trigger: Schema.optional(TriggerForm),
    }).ast,
  ),
);

/** Flat view of the action union (`Partial` collapses a discriminated union to its common keys). */
type ActionFormInput = {
  readonly kind?: Routine.Kind;
  readonly operation?: Ref.Ref<Operation.PersistentOperation>;
};

export type RoutineFormProps = {
  db: Database.Database;
  routine: Routine.Routine;
  /** Render the form for display only (e.g. an enabled routine, locked until disabled). */
  readonly?: boolean;
  /**
   * Commit the edit session; when set, the form renders a Save/Cancel action row (the companion's create
   * flow). A returned promise keeps the Save button disabled until it settles (double-click guard).
   */
  onSave?: () => void | Promise<void>;
  /** Discard the edit session. */
  onCancel?: () => void;
};

/**
 * Composite routine form: a single {@link Form.Root} over `{ name, description, action, trigger }`, with the
 * Actions and Triggers sections rendered as field sets at their paths (the discriminated unions resolve the
 * active member from the current values). Value changes autosave to the routine graph (live editing);
 * `readonly` displays them without edit affordances. The optional Save/Cancel row is used only by the
 * companion's create-from-template flow.
 *
 * The uncontrolled form is keyed by the routine/trigger identities and their spec kinds, so a kind switch
 * (or an external mutation of it) remounts and re-reads the seed values from the graph.
 * TODO(wittjosiah): Replace the kind-switch remount with a reactive `values` source (useObject snapshot
 *  projection) so external mutations flow in without remounting; requires a way to drop stale overrides
 *  for a cleared/changed union subtree.
 *
 * Created with `composable()` so it carries the COMPOSABLE marker and can be the child of
 * `Panel.Content asChild` (forwards ref and merges layout props onto the scroll viewport).
 */
export const RoutineForm = composable<HTMLDivElement, RoutineFormProps>((props, forwardedRef) => {
  const { routine } = props;
  // Subscribe to the routine and its primary trigger so kind changes (from this form or externally)
  // recompute the remount key.
  const [auto] = useObject(routine);
  const trigger = usePrimaryTrigger(routine);
  const [triggerSnapshot] = useObject(trigger);

  const formKey = [
    routine.id,
    auto.spec?.kind ?? 'none',
    trigger?.id ?? 'new',
    triggerSnapshot?.spec?.kind ?? 'none',
  ].join(':');

  return <RoutineFormImpl key={formKey} {...props} trigger={trigger} forwardedRef={forwardedRef} />;
});

RoutineForm.displayName = 'RoutineForm';

type RoutineFormImplProps = RoutineFormProps & {
  trigger?: Trigger.Trigger;
  forwardedRef: React.Ref<HTMLDivElement>;
};

const RoutineFormImpl = ({
  db,
  routine,
  trigger,
  readonly = false,
  onSave,
  onCancel,
  forwardedRef,
  ...props
}: RoutineFormImplProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [auto, updateAuto] = useObject(routine);
  const operations = useOperations(db);

  // Seed once per mount; the uncontrolled form owns edits until the enclosing key remounts it.
  const defaultValues = useMemo<Partial<RoutineFormValues>>(() => {
    const triggerSeed = triggerFormValues(trigger?.spec);
    return {
      name: auto.name,
      description: auto.description,
      // An absent spec means "operation, none chosen yet" (a scaffolded routine always carries an
      // instructions spec, so the only way to clear it is switching to an operation).
      action:
        auto.spec?.kind === 'instructions'
          ? { kind: 'instructions' }
          : { kind: 'runnable', operation: Routine.runnableRef(routine) },
      trigger:
        trigger && triggerSeed ? { ...triggerSeed, enabled: trigger.enabled, remote: trigger.remote } : undefined,
    };
  }, [routine, trigger]);

  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      'action.kind': (fieldProps) =>
        fieldProps.readonly ? null : (
          <ActionKindToggle
            value={(fieldProps.getValue() as Routine.Kind | undefined) ?? 'runnable'}
            onChange={(next) => fieldProps.onValueChange(fieldProps.type, next)}
          />
        ),
      'action.operation': (fieldProps) => (
        <RefField {...fieldProps} db={db} useResults={() => operations} getOptions={getOperationOptions} />
      ),
      ...triggerFieldMap,
    }),
    [db, operations],
  );

  // Preserves authored instructions across an instructions→operation→instructions round-trip within
  // this mount: switching away clears `spec` (orphaning the owned instructions, unreachable on an
  // unpersisted draft), so the ref is remembered here and reattached on the way back.
  const stashedInstructions = useRef<Ref.Ref<Instructions.Instructions> | undefined>(undefined);

  // Route each change to the part of the graph it edits: the general fields autosave onto the routine, the
  // action rewires `spec` (and its owned instructions), and the trigger writes the primary trigger's spec.
  const handleValuesChanged = useCallback(
    (values: Partial<RoutineFormValues>, { changed }: FormUpdateMeta<RoutineFormValues>) => {
      const action: ActionFormInput | undefined = values.action;
      const triggerValues: TriggerFormInput | undefined = values.trigger;
      for (const [path, isChanged] of Object.entries(changed)) {
        if (!isChanged) {
          continue;
        }
        if (path === 'name' || path === 'description') {
          updateAuto((routine) => {
            routine.name = values.name;
            routine.description = values.description;
          });
        } else if (path === 'action.kind') {
          const next = action?.kind ?? 'runnable';
          if (next === 'runnable') {
            stashedInstructions.current = Routine.instructionsRef(auto) ?? stashedInstructions.current;
          }
          applyActionKind(routine, next, stashedInstructions.current);
        } else if (path === 'action.operation') {
          applyActionOperation(routine, action?.operation);
        } else if (path.startsWith('trigger')) {
          applyTriggerValues(routine, trigger, triggerValues);
        }
      }
    },
    [updateAuto, auto, routine, trigger],
  );

  // Revert the trigger kind selection: clearing the spec changes the remount key, so the form re-seeds
  // and the variant picker reappears.
  const handleClearTrigger = useCallback(() => {
    if (trigger) {
      Obj.update(trigger, (trigger) => {
        trigger.spec = undefined;
      });
    }
  }, [trigger]);

  return (
    <Form.Root
      schema={RoutineFormSchema}
      db={db}
      readonly={readonly}
      fieldMap={fieldMap}
      defaultValues={defaultValues}
      onValuesChanged={handleValuesChanged}
      onSave={onSave}
      onCancel={onCancel}
    >
      <Form.Viewport scroll {...composableProps(props)} ref={forwardedRef}>
        <Form.Content>
          <Form.FieldSet schema={GeneralForm} />

          <Section title={t('actions.title')}>
            <ActionSection db={db} routine={routine} readonly={readonly} />
          </Section>

          {/* TODO(burdon): Support multiple triggers. */}
          <Section title={t('triggers.title')}>
            <TriggerSection readonly={readonly} onClear={handleClearTrigger} />
          </Section>

          {/* Save/Cancel for the edit session (value changes autosave to the in-memory graph as they occur). */}
          {onSave && <Form.Actions />}
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

/** Lightweight labelled grouping for a section (no `Settings` chrome). */
const Section = ({ title, children }: PropsWithChildren<{ title: string }>) => (
  <div className='flex flex-col mt-4'>
    <Form.Label standalone label={title} />
    {children}
  </div>
);

//
// Actions
//

const ACTION_PATH = ['action'];

/**
 * The action section: the kind toggle and operation picker are the `action` field set; the owned
 * Instructions (not a form value) is edited inline below it when the instructions kind is active.
 * The owned ref is always locally resolvable, and the enclosing form re-renders this when `spec` changes.
 */
const ActionSection = ({
  db,
  routine,
  readonly,
}: {
  db: Database.Database;
  routine: Routine.Routine;
  readonly?: boolean;
}) => {
  const action = useFormValues<ActionFormInput>('RoutineForm.ActionSection', ACTION_PATH);
  const kind = action?.kind ?? 'runnable';
  const instructions = Routine.instructionsRef(routine)?.target;

  return (
    <div className='flex flex-col'>
      <Form.FieldSet path={ACTION_PATH} schema={ActionForm} />
      {kind === 'instructions' && instructions ? (
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

/**
 * Switch the action kind. Switching to an operation clears the spec (the operation is chosen via the picker);
 * a previously-owned instructions stays parented to the routine (cascade-deleted with it) but is no longer
 * the action. Switching to instructions reattaches `previousInstructions` (the caller's stash from the last
 * switch away, so authored text survives a round-trip) or seeds a fresh owned instructions action (the
 * executing operation is the implicit RunInstructions). `makeRoutine` establishes the owned-instructions
 * wiring when the routine is scaffolded.
 */
const applyActionKind = (
  routine: Routine.Routine,
  next: Routine.Kind,
  previousInstructions?: Ref.Ref<Instructions.Instructions>,
): void => {
  Obj.update(routine, (routine) => {
    if (next === 'runnable') {
      routine.spec = undefined;
    } else if (routine.spec?.kind !== 'instructions') {
      if (previousInstructions) {
        routine.spec = { kind: 'instructions', instructions: previousInstructions };
      } else {
        const instructions = Instructions.make({});
        routine.spec = { kind: 'instructions', instructions: Ref.make(instructions) };
      }
    }
  });
  // Re-wire the owned trigger to dispatch the new action (RunInstructions vs the operation).
  wireTriggers(routine);
};

/** Bind the routine's action to an operation (or clear it). */
const applyActionOperation = (
  routine: Routine.Routine,
  operation: Ref.Ref<Operation.PersistentOperation> | undefined,
): void => {
  Obj.update(routine, (routine) => {
    routine.spec = operation ? { kind: 'runnable', runnable: operation } : undefined;
  });
  // Keep the owned trigger's `function`/`input` in sync with the new action.
  wireTriggers(routine);
};

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
