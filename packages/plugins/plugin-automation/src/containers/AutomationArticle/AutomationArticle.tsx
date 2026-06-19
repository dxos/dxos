//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { type ReactNode, useCallback, useMemo, useState } from 'react';

import { useProcessManagerRuntime } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Operation, Routine, ServiceResolver, Trigger, TriggerEvent } from '@dxos/compute';
import { Context } from '@dxos/context';
import { type Database, Entity, Feed, Filter, JsonSchema, Obj, Query, Ref, Scope, Type } from '@dxos/echo';
import { KEY_FEED_CURSOR, TriggerDispatcher } from '@dxos/functions-runtime';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { type Space, getSpace, useObject, useQuery } from '@dxos/react-client/echo';
import { DropdownMenu, IconButton, Input, useTranslation } from '@dxos/react-ui';
import {
  Form,
  type FormFieldRendererProps,
  type FormFieldMap,
  RefField,
  SelectField,
  Settings,
} from '@dxos/react-ui-form';
import { Accordion } from '@dxos/react-ui-list';
import { ParentLabelAnnotation } from '@dxos/schema';

import { meta } from '#meta';
import { Automation } from '#types';

import { type CronSpecType, CronBuilder, FrequencyDefaults, describeCron, fromCron, toCron } from '../../components';

const RUN_ROUTINE_DXN = 'org.dxos.function.prompt';

export type AutomationArticleProps = AppSurface.ObjectArticleProps<Automation.Automation>;

export const AutomationArticle = ({ role, subject }: AutomationArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(subject);
  const trigger = usePrimaryTrigger(subject);
  const space = getSpace(subject);

  if (!db) {
    return null;
  }

  return (
    <Settings.Viewport>
      <Settings.Section title={t('general.title')} description={t('general.description')}>
        <Settings.Panel>
          <GeneralSection automation={subject} trigger={trigger} />
        </Settings.Panel>
      </Settings.Section>

      <Settings.Section title={t('trigger-picker.title')} description={t('trigger-picker.description')}>
        <Settings.Panel>
          <TriggerSection db={db} automation={subject} trigger={trigger} />
          {space && trigger && <TriggerTestingSection space={space} trigger={trigger} />}
        </Settings.Panel>
      </Settings.Section>

      <Settings.Section title={t('action.title')} description={t('action.description')}>
        <Settings.Panel>
          <ActionSection db={db} automation={subject} trigger={trigger} />
        </Settings.Panel>
      </Settings.Section>
    </Settings.Viewport>
  );
};

//
// General (name + enabled)
//

const GeneralForm = Schema.Struct({
  name: Schema.String.pipe(Schema.annotations({ title: 'Name' }), Schema.optional),
  enabled: Schema.Boolean.annotations({ title: 'Enabled' }),
});
type GeneralFormValues = Schema.Schema.Type<typeof GeneralForm>;

/**
 * Top-level metadata: name plus the enabled toggle. The automation has no `enabled` field of its own —
 * enabling it toggles its trigger's `enabled` (the flag the dispatcher reads), so the switch is disabled
 * until both a trigger and an action exist.
 */
export const GeneralSection = ({
  automation,
  trigger,
}: {
  automation: Automation.Automation;
  trigger?: Trigger.Trigger;
}) => {
  const { defaultValues, fieldMap, handleValuesChanged } = useGeneralForm(automation, trigger);

  return (
    <Form.Root
      key={trigger?.id ?? 'new'}
      schema={GeneralForm}
      defaultValues={defaultValues}
      fieldMap={fieldMap}
      onValuesChanged={handleValuesChanged}
    >
      <Form.Content>
        <Form.FieldSet />
      </Form.Content>
    </Form.Root>
  );
};

/** Enabled switch field; disabled (with a hint) until the automation has both a trigger and an action. */
const EnabledField = ({
  canEnable,
  messageKey,
  ...props
}: FormFieldRendererProps & { canEnable: boolean; messageKey?: string }) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <div className='flex items-center gap-2 pt-form-padding'>
      <Input.Root>
        <Input.Switch
          disabled={!canEnable}
          checked={Boolean(props.getValue()) && canEnable}
          onCheckedChange={(checked) => props.onValueChange(props.type, checked)}
        />
      </Input.Root>
      <span className='text-sm'>{props.label}</span>
      {!canEnable && messageKey && <span className='text-sm text-description'>{t(messageKey)}</span>}
    </div>
  );
};

//
// Trigger testing section
//

type TriggerTestingSectionProps = {
  space: Space;
  trigger: Trigger.Trigger;
};

const TESTING_ITEM = { id: 'testing' };

/**
 * Collapsed "Testing" section within the Trigger panel. Provides kind-specific manual
 * affordances: force-run for timer triggers, cursor reset for feed triggers.
 * Not rendered for trigger kinds with no applicable action (email, webhook, subscription).
 */
const TriggerTestingSection = ({ space, trigger }: TriggerTestingSectionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const client = useClient();
  const processManagerRuntime = useProcessManagerRuntime();
  const [properties] = useObject(space.properties);
  const computeEnvironment = properties.computeEnvironment ?? 'local';
  const functionsServiceClient = useMemo(() => FunctionsServiceClient.fromClient(client), [client]);

  const spec = Obj.getSnapshot(trigger).spec;
  const kind = spec?.kind;
  const cursor = kind === 'feed' ? Obj.getKeys(trigger, KEY_FEED_CURSOR).at(0)?.id : undefined;

  const handleForceRun = useCallback(async () => {
    if (computeEnvironment === 'disabled') {
      return;
    }
    if (computeEnvironment === 'local') {
      await processManagerRuntime
        .runPromise(
          Effect.gen(function* () {
            const dispatcher = yield* TriggerDispatcher;
            yield* dispatcher.invokeTrigger({
              trigger,
              event: { tick: Date.now() } satisfies TriggerEvent.TimerEvent,
            });
          }).pipe(Effect.provide(ServiceResolver.provide({ space: space.id }, TriggerDispatcher))),
        )
        .catch((error: unknown) => log.catch(error));
      return;
    }
    await functionsServiceClient
      .forceRunCronTrigger(Context.default(), space.id, trigger.id)
      .catch((error: unknown) => log.catch(error));
  }, [computeEnvironment, functionsServiceClient, processManagerRuntime, space.id, trigger]);

  const handleResetCursor = useCallback(async () => {
    Obj.update(trigger, (trigger) => {
      Obj.deleteKeys(trigger, KEY_FEED_CURSOR);
    });
    await space.db.flush({ indexes: true });
  }, [space.db, trigger]);

  if (kind !== 'timer' && kind !== 'feed') {
    return null;
  }

  return (
    <Accordion.Root items={[TESTING_ITEM]}>
      {({ items }) =>
        items.map((item) => (
          <Accordion.Item key={item.id} item={item}>
            <Accordion.ItemHeader>{t('testing.title')}</Accordion.ItemHeader>
            <Accordion.ItemBody>
              {kind === 'timer' && (
                <IconButton
                  icon='ph--play--regular'
                  label={t('force-run.label')}
                  disabled={computeEnvironment === 'disabled'}
                  onClick={handleForceRun}
                />
              )}
              {kind === 'feed' && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <IconButton
                      icon='ph--arrow-clockwise--regular'
                      label={t('reset-cursor.label')}
                      disabled={!cursor}
                    />
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content side='top'>
                      <DropdownMenu.Viewport>
                        <DropdownMenu.Item onClick={handleResetCursor}>
                          {t('reset-cursor-confirm.label')}
                        </DropdownMenu.Item>
                      </DropdownMenu.Viewport>
                      <DropdownMenu.Arrow />
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              )}
            </Accordion.ItemBody>
          </Accordion.Item>
        ))
      }
    </Accordion.Root>
  );
};

//
// Action
//

// Two-part action form: pick a kind (operation | routine), then the specific object (a RefField object
// picker for that type). Modeled as a top-level discriminated union so the Form renders the kind select and
// the chosen kind's picker as one flat field set (no nested, bordered sub-fieldset). Selecting a routine
// binds it as input to the "Run Routine" (AgentPrompt) operation, so the runnable a trigger points at is
// always an Operation.
const OperationAction = Schema.Struct({
  kind: Schema.Literal('operation'),
  operation: Ref.Ref(Operation.PersistentOperation).pipe(Schema.annotations({ title: 'Operation' }), Schema.optional),
});

const RoutineAction = Schema.Struct({
  kind: Schema.Literal('routine'),
  routine: Ref.Ref(Routine.Routine).pipe(Schema.annotations({ title: 'Routine' }), Schema.optional),
});

const ActionForm = Schema.Union(OperationAction, RoutineAction);

type ActionFormValues = Schema.Schema.Type<typeof ActionForm>;

// Flat view of the form values (see `TriggerFormInput`): reach the variant fields that `Partial<T>` drops.
type ActionFormInput = {
  readonly kind?: 'operation' | 'routine';
  readonly operation?: Ref.Ref<Operation.PersistentOperation>;
  readonly routine?: Ref.Ref<Routine.Routine>;
};

export const ActionSection = ({
  db,
  automation,
  trigger,
}: {
  db: Database.Database;
  automation: Automation.Automation;
  trigger?: Trigger.Trigger;
}) => {
  const { defaultValues, fieldMap, handleValuesChanged, selectedOperation } = useActionForm(db, automation, trigger);

  return (
    <div className='flex flex-col gap-2'>
      <Form.Root
        // Remount when the bound trigger changes so the uncontrolled form picks up its action.
        key={trigger?.id ?? 'new'}
        schema={ActionForm}
        defaultValues={defaultValues}
        db={db}
        fieldMap={fieldMap}
        onValuesChanged={handleValuesChanged}
      >
        <Form.Content>
          <Form.FieldSet />
        </Form.Content>
      </Form.Root>

      {/* Bind the operation's inputs (e.g. an object ref) once a trigger exists — input lives on the trigger;
          a ref set here is what associates a non-feed object via `automationsForObject`. */}
      {trigger && selectedOperation && <ActionInputEditor db={db} operation={selectedOperation} trigger={trigger} />}
    </div>
  );
};

const ActionInputEditor = ({
  db,
  operation,
  trigger,
}: {
  db: Database.Database;
  operation: Operation.PersistentOperation;
  trigger: Trigger.Trigger;
}) => {
  const { t } = useTranslation(meta.profile.key);
  const effectSchema = useMemo(
    () => (operation.inputSchema ? JsonSchema.toEffectSchema(operation.inputSchema) : undefined),
    [operation.inputSchema],
  );
  const propertyCount = operation.inputSchema?.properties ? Object.keys(operation.inputSchema.properties).length : 0;
  // Read the current input once per operation (key remounts the uncontrolled Form when the action changes).
  const defaultValues = useMemo(
    () => ({ ...((trigger.input as Record<string, unknown>) ?? {}) }),
    [operation.id, trigger],
  );
  const handleValuesChanged = useCallback(
    (values: Record<string, unknown>) => {
      Obj.update(trigger, (trigger) => {
        trigger.input = values;
      });
    },
    [trigger],
  );

  if (!effectSchema || propertyCount === 0) {
    return null;
  }

  return (
    <>
      <Form.Label label={t('action-input.label')} standalone />
      <Form.Root
        key={operation.id}
        schema={effectSchema}
        defaultValues={defaultValues}
        db={db}
        onValuesChanged={handleValuesChanged}
      >
        <Form.FieldSet />
      </Form.Root>
    </>
  );
};

//
// Trigger
//

// Scoped trigger form: timer (cron) or feed, modeled as a top-level discriminated union so the Form renders
// the kind select and the chosen kind's field as one flat field set (no nested, bordered sub-fieldset). The
// feed field carries ParentLabelAnnotation so the built-in RefField labels feed options by their parent
// object (e.g. the mailbox) — configured per field via the annotation rather than a hard-coded option mapper.
const TimerSpecForm = Schema.Struct({
  kind: Schema.Literal('timer'),
  cron: Schema.String.pipe(Schema.annotations({ title: 'Schedule (cron)' }), Schema.optional),
});
const FeedSpecForm = Schema.Struct({
  kind: Schema.Literal('feed'),
  feed: Ref.Ref(Feed.Feed).pipe(
    ParentLabelAnnotation.set(true),
    Schema.annotations({ title: 'Feed' }),
    Schema.optional,
  ),
});
const TriggerForm = Schema.Union(TimerSpecForm, FeedSpecForm);
type TriggerFormValues = Schema.Schema.Type<typeof TriggerForm>;

// Flat view of the form values: `Partial<TriggerFormValues>` collapses a discriminated union to its common
// key alone (`kind`), so reach the variant fields through this all-optional shape instead. `Partial<T>` is
// assignable to it, so handlers/helpers can accept the Form's value verbatim and still read `cron`/`feed`.
type TriggerFormInput = {
  readonly kind?: 'timer' | 'feed';
  readonly cron?: string;
  readonly feed?: Ref.Ref<Feed.Feed>;
};

/** Project a trigger spec onto the form's discriminated-union members. */
const triggerFormValues = (spec?: Trigger.Spec): TriggerFormInput =>
  spec?.kind === 'feed'
    ? { kind: 'feed', feed: spec.feed }
    : { kind: 'timer', cron: spec?.kind === 'timer' ? spec.cron : '' };

// Fallback cron used when no schedule has been set yet.
const DEFAULT_TIMER_CRON = toCron(FrequencyDefaults.daily);

// Build a trigger spec from the form's values. Returned as just the two specs we construct (not the full
// `Trigger.Spec` union) so the subscription spec's deep readonly query AST never enters the type and the
// result stays assignable to the mutable `trigger.spec`.
const triggerFormSpec = (values: TriggerFormInput): Trigger.TimerSpec | Trigger.FeedSpec =>
  values.kind === 'feed' ? { kind: 'feed', feed: values.feed } : Trigger.specTimer(values.cron || DEFAULT_TIMER_CRON);

export const TriggerSection = ({
  db,
  automation,
  trigger,
}: {
  db: Database.Database;
  automation: Automation.Automation;
  trigger?: Trigger.Trigger;
}) => {
  const { defaultValues, fieldMap, handleValuesChanged } = useTriggerForm(db, automation, trigger);

  return (
    <Form.Root
      // Remount when the bound trigger changes so the uncontrolled form picks up its spec.
      key={trigger?.id ?? 'new'}
      schema={TriggerForm}
      defaultValues={defaultValues}
      db={db}
      fieldMap={fieldMap}
      onValuesChanged={handleValuesChanged}
    >
      <Form.Content>
        <Form.FieldSet />
      </Form.Content>
    </Form.Root>
  );
};

//
// Inline form (companion)
//

/** Compact section heading for the inline form — just a small title, no description (cf. Settings.Section). */
const InlineSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className='flex flex-col gap-1'>
    <h3 className='pli-1 text-sm font-medium text-description'>{title}</h3>
    <Settings.Panel>{children}</Settings.Panel>
  </div>
);

/**
 * Compact inline view used in the Automation companion. Renders the same three sections as the full article
 * (General / Trigger / Action) with condensed headings and no descriptions or scrolling Settings.Viewport.
 */
export const AutomationInlineForm = ({
  automation,
  db,
}: {
  automation: Automation.Automation;
  db: Database.Database;
}) => {
  const { t } = useTranslation(meta.profile.key);
  const trigger = usePrimaryTrigger(automation);

  return (
    <div className='flex flex-col gap-3'>
      <InlineSection title={t('general.title')}>
        <GeneralSection automation={automation} trigger={trigger} />
      </InlineSection>
      <InlineSection title={t('trigger-picker.title')}>
        <TriggerSection db={db} automation={automation} trigger={trigger} />
      </InlineSection>
      <InlineSection title={t('action.title')}>
        <ActionSection db={db} automation={automation} trigger={trigger} />
      </InlineSection>
    </div>
  );
};

//
// Cron field
//

/** Renders the CronBuilder with a live cronstrue description below it. */
const CronField = (props: FormFieldRendererProps) => {
  const existingCron = props.getValue() as string | undefined;
  const initialSpec = useMemo(() => (existingCron ? fromCron(existingCron) : FrequencyDefaults.daily), []);
  const [description, setDescription] = useState(() => describeCron(existingCron ?? toCron(initialSpec)));

  const handleChange = useCallback(
    (spec: CronSpecType, cron: string) => {
      setDescription(describeCron(cron));
      props.onValueChange(props.type, cron);
    },
    [props.type, props.onValueChange],
  );

  return (
    <div className='flex flex-col gap-1 mbs-2'>
      <CronBuilder value={initialSpec} onChange={handleChange} />
      <p className='text-sm text-description pli-1 text-right'>{description}</p>
    </div>
  );
};

CronField.displayName = 'AutomationArticle.CronField';

//
// Hooks
//

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

/** Form state for the General section: the name plus an enabled toggle that writes through to the trigger. */
const useGeneralForm = (automation: Automation.Automation, trigger?: Trigger.Trigger) => {
  const [auto, updateAuto] = useObject(automation);
  const canEnable = Boolean(trigger && auto.runnable);
  const messageKey = !trigger
    ? 'add-trigger-first.message'
    : !auto.runnable
      ? 'select-action-first.message'
      : undefined;

  const fieldMap = useMemo<FormFieldMap>(
    () => ({ enabled: (props) => <EnabledField {...props} canEnable={canEnable} messageKey={messageKey} /> }),
    [canEnable, messageKey],
  );

  // Read once per trigger identity; the uncontrolled form owns edits after mount.
  const defaultValues = useMemo<Partial<GeneralFormValues>>(
    () => ({ name: auto.name, enabled: (trigger?.enabled ?? false) && canEnable }),
    [automation, trigger],
  );

  const handleValuesChanged = useCallback(
    (values: Partial<GeneralFormValues>) => {
      updateAuto((automation) => {
        automation.name = values.name;
      });
      if (trigger && canEnable) {
        Obj.update(trigger, (trigger) => {
          trigger.enabled = values.enabled ?? false;
        });
      }
    },
    [updateAuto, trigger, canEnable],
  );

  return { defaultValues, fieldMap, handleValuesChanged };
};

/** Form state for the Action section: pick an operation|routine and bind it to the trigger's function/input. */
const useActionForm = (db: Database.Database, automation: Automation.Automation, trigger?: Trigger.Trigger) => {
  const { t } = useTranslation(meta.profile.key);
  const [auto, updateAuto] = useObject(automation);
  // Query by typename DXN so results stay untyped (`Entity.Any[]`), as RefField.useResults expects.
  const operations = useQuery(
    db,
    // Include registry operations (built-in / plugin-provided) alongside space-resident ones.
    Query.select(Filter.type(DXN.make(Type.getTypename(Operation.PersistentOperation)))).from(
      Scope.space(),
      Scope.registry(),
    ),
  );
  const routines = useQuery(
    db,
    Query.select(Filter.type(DXN.make(Type.getTypename(Routine.Routine)))).from(Scope.space(), Scope.registry()),
  );
  const runRoutineOp = useMemo(() => findRunRoutineOp(operations), [operations]);
  const boundRoutine = getBoundRoutine(trigger);
  const runnableTarget = auto.runnable?.target;

  const kindOptions = useMemo(
    () => [
      { value: 'operation', label: t('action-kind.operation.label') },
      { value: 'routine', label: t('action-kind.routine.label') },
    ],
    [t],
  );
  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      kind: (props) => <SelectField {...props} options={kindOptions} />,
      // Custom useResults so pickers draw from the already-queried sets (space + registry for
      // operations; space-only for routines) rather than RefField's default typename query.
      operation: (props) => <RefField {...props} db={db} useResults={() => operations} />,
      routine: (props) => <RefField {...props} db={db} useResults={() => routines} />,
    }),
    [kindOptions, operations, routines, db],
  );

  // Read the current action once per trigger identity (the uncontrolled form owns edits after mount).
  const defaultValues = useMemo<Partial<ActionFormValues>>(() => {
    if (boundRoutine) {
      return { kind: 'routine', routine: Ref.make(boundRoutine) };
    }
    if (auto.runnable && Obj.instanceOf(Operation.PersistentOperation, runnableTarget)) {
      return { kind: 'operation', operation: auto.runnable };
    }
    return { kind: 'operation' };
  }, [automation, trigger]);

  const handleValuesChanged = useCallback(
    (values: Partial<ActionFormValues>) => {
      const action: ActionFormInput = values;
      if (action.kind === 'routine') {
        const routineRef = action.routine;
        if (!routineRef || !runRoutineOp) {
          return;
        }
        updateAuto((automation) => {
          automation.runnable = Ref.make(runRoutineOp);
        });
        if (trigger) {
          Obj.update(trigger, (trigger) => {
            trigger.function = Ref.make(runRoutineOp);
            trigger.input = { prompt: routineRef, input: {} };
          });
        }
      } else if (action.kind === 'operation' && action.operation) {
        const operationRef = action.operation;
        updateAuto((automation) => {
          automation.runnable = operationRef;
        });
        if (trigger) {
          Obj.update(trigger, (trigger) => {
            trigger.function = operationRef;
            trigger.input = undefined;
          });
        }
      }
    },
    [runRoutineOp, trigger, updateAuto],
  );

  // The directly-selected operation (not the routine-bound AgentPrompt case); its input schema drives the editor.
  const selectedOperation =
    !boundRoutine && Obj.instanceOf(Operation.PersistentOperation, runnableTarget) ? runnableTarget : undefined;

  return { defaultValues, fieldMap, handleValuesChanged, selectedOperation };
};

/** Form state for the Trigger section: the timer|feed spec, plus create-on-first-edit and remove handlers. */
const useTriggerForm = (db: Database.Database, automation: Automation.Automation, trigger?: Trigger.Trigger) => {
  const { t } = useTranslation(meta.profile.key);
  const kindOptions = useMemo(
    () => [
      { value: 'timer', label: t('trigger-kind.timer.label') },
      { value: 'feed', label: t('trigger-kind.feed.label') },
    ],
    [t],
  );
  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      kind: (props) => <SelectField {...props} options={kindOptions} />,
      cron: (props) => <CronField {...props} />,
    }),
    [kindOptions],
  );
  // Read once per trigger identity (uncontrolled Form); default to an empty timer spec.
  const defaultValues = useMemo<Partial<TriggerFormValues>>(() => triggerFormValues(trigger?.spec), [trigger]);

  const handleValuesChanged = useCallback(
    (values: Partial<TriggerFormValues>) => {
      const spec = triggerFormSpec(values);
      if (trigger) {
        Obj.update(trigger, (trigger) => {
          trigger.spec = spec;
        });
      } else {
        // Create the trigger on first edit; `function` is wired by the action section, and it stays disabled
        // until an action is set, so a function-less trigger never dispatches. The trigger is owned by the
        // automation (it is only reachable via it), so it is parented and cascade-deletes with the automation.
        const created = db.add(Trigger.make({ function: automation.runnable, enabled: false, spec }));
        Obj.setParent(created, automation);
        Obj.update(automation, (automation) => {
          automation.triggers = [...automation.triggers, Ref.make(created)];
        });
      }
    },
    [db, automation, trigger],
  );

  return { defaultValues, fieldMap, handleValuesChanged };
};

//
// Helpers
//

/** Read back the routine bound into a trigger's AgentPrompt input, if any. */
const getBoundRoutine = (trigger?: Trigger.Trigger): Routine.Routine | undefined => {
  const prompt = (trigger?.input as { prompt?: Ref.Ref<unknown> } | undefined)?.prompt;
  const target = Ref.isRef(prompt) ? prompt.target : undefined;
  return Obj.instanceOf(Routine.Routine, target) ? target : undefined;
};

/** Find the persisted "Run Routine" (AgentPrompt) operation by its DXN, avoiding a hard assistant-toolkit dep. */
const findRunRoutineOp = (operations: Entity.Any[]): Operation.PersistentOperation | undefined => {
  for (const op of operations) {
    if (!Obj.instanceOf(Operation.PersistentOperation, op)) {
      continue;
    }
    // Control-flow narrowed: op is Entity.Any & Operation.PersistentOperation.
    try {
      if (Operation.deserialize(op).meta.key.toString().includes(RUN_ROUTINE_DXN)) {
        return op;
      }
    } catch {
      // Not a valid/deserializable operation or key does not match.
    }
  }
  return undefined;
};
