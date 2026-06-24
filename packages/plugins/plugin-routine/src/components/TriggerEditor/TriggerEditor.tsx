//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { Trigger } from '@dxos/compute';
import { DXN, type Database, Feed, Filter, Obj, Query, Ref, Scope, Type } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton, ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldRendererProps, type FormFieldMap, SelectField } from '@dxos/react-ui-form';
import { ParentLabelAnnotation } from '@dxos/schema';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { Routine } from '#types';

import {
  FrequencyDefaults,
  Schedule,
  type ScheduleKind,
  type ScheduleValue,
  cronToSchedule,
  describeCron,
  scheduleToCron,
  toCron,
} from '../Schedule';
import { TriggerKindSelector, type TriggerKind } from './TriggerKindSelector';

// A recurring trigger fires on a cron, so the one-time `once` kind is not offered here.
const RECURRING_KINDS = ['hourly', 'daily', 'weekly', 'monthly', 'custom'] as const satisfies readonly ScheduleKind[];

// Scoped trigger form, modeled as a top-level discriminated union (one member per pluggable variant) so the
// Form renders the chosen kind's fields as one flat field set (no nested, bordered sub-fieldset). The kind
// itself is chosen by `TriggerKindPicker` (a radio-card list) rather than a select. The feed field carries
// ParentLabelAnnotation so the built-in RefField labels feed options by their parent object (e.g. the mailbox).
// The trigger's `enabled` flag is not edited here — it is toggled for the routine as a whole from the toolbar.
const TimerSpecForm = Schema.Struct({
  kind: Schema.Literal('timer'),
  cron: Schema.String.pipe(Schema.annotations({ title: 'Schedule (cron)' }), Schema.optional),
});

const SubscriptionSpecForm = Schema.Struct({
  kind: Schema.Literal('subscription'),
  // The object type to watch; converted to a `Filter.type` query. `typename` renders via a custom select of
  // the space/registry types (see `TypeSelectField`); `deep`/`delay` map to the subscription's options.
  typename: Schema.String.pipe(Schema.annotations({ title: 'Type' }), Schema.optional),
  deep: Schema.Boolean.pipe(Schema.annotations({ title: 'Nested' }), Schema.optional),
  delay: Schema.Number.pipe(Schema.annotations({ title: 'Delay (ms)' }), Schema.optional),
});

const WebhookSpecForm = Schema.Struct({
  kind: Schema.Literal('webhook'),
  method: Schema.String.pipe(Schema.annotations({ title: 'Method' }), Schema.optional),
  port: Schema.Number.pipe(Schema.annotations({ title: 'Port' }), Schema.optional),
});

const FeedSpecForm = Schema.Struct({
  kind: Schema.Literal('feed'),
  feed: Ref.Ref(Feed.Feed).pipe(
    ParentLabelAnnotation.set(true),
    Schema.annotations({ title: 'Feed' }),
    Schema.optional,
  ),
});

const EmailSpecForm = Schema.Struct({
  kind: Schema.Literal('email'),
});

const TriggerForm = Schema.Union(TimerSpecForm, SubscriptionSpecForm, WebhookSpecForm, FeedSpecForm, EmailSpecForm);
type TriggerFormValues = Schema.Schema.Type<typeof TriggerForm>;

// Flat view of the form values: `Partial<TriggerFormValues>` collapses a discriminated union to its common
// key alone (`kind`), so reach the variant fields through this all-optional shape instead. `Partial<T>` is
// assignable to it, so handlers/helpers can accept the Form's value verbatim and still read the variant fields.
type TriggerFormInput = {
  readonly kind?: TriggerKind;
  readonly cron?: string;
  readonly method?: string;
  readonly port?: number;
  readonly feed?: Ref.Ref<Feed.Feed>;
  readonly typename?: string;
  readonly deep?: boolean;
  readonly delay?: number;
};

/** Project a trigger spec onto the form's discriminated-union members. */
const triggerFormValues = (spec?: Trigger.Spec): TriggerFormInput => {
  switch (spec?.kind) {
    case 'subscription':
      // The watched typename is preserved in `query.raw` so the Type select can round-trip it.
      return {
        kind: 'subscription',
        typename: spec.query?.raw,
        deep: spec.options?.deep,
        delay: spec.options?.delay,
      };
    case 'feed':
      return {
        kind: 'feed',
        feed: spec.feed,
      };
    case 'webhook':
      return {
        kind: 'webhook',
        method: spec.method,
        port: spec.port,
      };
    case 'email':
      return {
        kind: 'email',
      };
    case 'timer':
      return {
        kind: 'timer',
        cron: spec.cron,
      };
    default:
      // No spec yet: leave the kind unset so the editor shows the variant picker (nothing selected).
      return {};
  }
};

// Fallback cron used when no schedule has been set yet.
const DEFAULT_TIMER_CRON = toCron(FrequencyDefaults.daily);

/** Build the subscription query: filter by the chosen type, or match everything until one is picked. */
const subscriptionQuery = (typename?: string): Query.Any =>
  typename ? Query.select(Filter.type(DXN.make(typename))) : Query.select(Filter.everything());

/** Build a trigger spec from the form's values. */
const triggerFormSpec = (values: TriggerFormInput): Trigger.Spec => {
  switch (values.kind) {
    case 'subscription': {
      const hasOptions = values.deep != null || values.delay != null;
      return {
        kind: 'subscription',
        // Carry the typename in `raw` so the editor can recover the Type selection on reopen.
        query: { raw: values.typename, ast: subscriptionQuery(values.typename).ast },
        options: hasOptions ? { deep: values.deep, delay: values.delay } : undefined,
      };
    }
    case 'feed':
      return {
        kind: 'feed',
        feed: values.feed,
      };
    case 'webhook':
      return Trigger.specWebhook({ method: values.method, port: values.port });
    case 'email':
      return Trigger.specEmail();
    case 'timer':
    default:
      return Trigger.specTimer(values.cron || DEFAULT_TIMER_CRON);
  }
};

export type TriggerEditorProps = ThemedClassName<{
  db: Database.Database;
  routine: Routine.Routine;
  trigger?: Trigger.Trigger;
  /** Input bound to the trigger's function (e.g. the instructions a RunInstructions action runs). */
  triggerInput?: Record<string, unknown>;
  /** Render the trigger for display only (no variant picker, clear, or field edits). */
  readonly?: boolean;
}>;

export const TriggerEditor = ({ classNames, db, routine, trigger, triggerInput, readonly }: TriggerEditorProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { defaultValues, fieldMap, kind, resetNonce, handleClose, handleValuesChanged } = useTriggerForm(
    db,
    routine,
    trigger,
    triggerInput,
  );

  return (
    <Form.Root
      // Remount when the bound trigger changes (picks up its spec) or on reset (reverts to the picker).
      key={`${trigger?.id ?? 'new'}:${resetNonce}`}
      schema={TriggerForm}
      db={db}
      readonly={readonly}
      fieldMap={fieldMap}
      defaultValues={defaultValues}
      onValuesChanged={handleValuesChanged}
    >
      <Form.Content classNames={mx(kind && 'pb-2 bg-card-surface border border-separator rounded-xs', classNames)}>
        {kind && (
          <div className='flex items-center'>
            <div className='pl-2 grow truncate'>{t(`trigger-kind.${kind}.label`)}</div>
            {!readonly && (
              <IconButton
                iconOnly
                variant='ghost'
                square
                icon='ph--x--regular'
                label={t('trigger-kind.clear.label')}
                onClick={handleClose}
              />
            )}
          </div>
        )}
        <Form.FieldSet classNames='px-2' />
        {/* Email triggers have no configuration; surface an explanatory note instead of an empty body. */}
        {kind === 'email' && <p className='px-2 text-sm text-description'>{t('trigger-kind.email-note.message')}</p>}
      </Form.Content>
    </Form.Root>
  );
};

/** Selects the ECHO object type to watch (subscription `typename`) from the space + registry schemas. */
const TypeSelectField = (props: FormFieldRendererProps) => {
  const types = useQuery(props.db, Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()));
  const options = useMemo(
    () =>
      types
        .filter((type) => !Type.isTypeKind(type))
        .map((type) => Type.getTypename(type))
        .filter((typename): typename is string => !!typename)
        .map((typename) => ({ value: typename, label: typename })),
    [types],
  );
  return <SelectField {...props} options={options} />;
};

TypeSelectField.displayName = 'TriggerEditor.TypeSelectField';

/** Edits the cron via the Schedule picker (recurring kinds only) with a live cronstrue description below it. */
const CronField = (props: FormFieldRendererProps) => {
  const cron = (props.getValue() as string | undefined) || DEFAULT_TIMER_CRON;
  // Read once per mount; the Schedule owns its state and emits cron changes via `handleChange`.
  const initial = useMemo(() => cronToSchedule(cron), []);

  const handleChange = useCallback(
    (value: ScheduleValue) => {
      const next = scheduleToCron(value);
      if (next) {
        props.onValueChange(props.type, next);
      }
    },
    [props.type, props.onValueChange],
  );

  // The Schedule picker is interactive-only; render a human-readable description for the read-only view.
  if (props.readonly) {
    return <p className='px-2 text-sm text-description'>{describeCron(cron)}</p>;
  }

  return (
    <Schedule.Root kinds={RECURRING_KINDS} defaultValue={initial} onValueChange={handleChange}>
      <Schedule.Header />
      <Schedule.Kind />
      <Schedule.Body />
    </Schedule.Root>
  );
};

CronField.displayName = 'TriggerEditor.CronField';

/** Form state for the Trigger section: the chosen variant spec, plus create-on-first-edit handler. */
const useTriggerForm = (
  db: Database.Database,
  routine: Routine.Routine,
  trigger?: Trigger.Trigger,
  triggerInput?: Record<string, unknown>,
) => {
  const methodOptions = useMemo(
    () => [
      { value: 'GET', label: 'GET' },
      { value: 'POST', label: 'POST' },
    ],
    [],
  );

  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      // Show the variant picker only until a kind is chosen; once selected the row is replaced by that
      // variant's editor (the kind field renders nothing).
      kind: (props) =>
        props.getValue() ? null : <TriggerKindSelector onChange={(next) => props.onValueChange(props.type, next)} />,
      cron: (props) => <CronField {...props} />,
      method: (props) => <SelectField {...props} options={methodOptions} />,
      typename: (props) => <TypeSelectField {...props} />,
    }),
    [methodOptions],
  );

  // Bumping this remounts the uncontrolled Form so it re-reads `defaultValues` (used to revert to the picker).
  const [resetNonce, setResetNonce] = useState(0);
  // Read per trigger identity / reset; a trigger with no spec yet starts with no kind (shows the picker).
  const defaultValues = useMemo<Partial<TriggerFormValues>>(
    () => ({ ...triggerFormValues(trigger?.spec) }),
    [trigger, resetNonce],
  );
  // Mirror the active kind: gates the variant picker (shown only while unset) and the variant-specific notes.
  const [kind, setKind] = useState<TriggerKind | undefined>(() => triggerFormValues(trigger?.spec).kind);

  // Revert the kind selection: clear the trigger's spec and remount the Form so the picker reappears.
  const handleClose = useCallback(() => {
    setKind(undefined);
    setResetNonce((nonce) => nonce + 1);
    if (trigger) {
      Obj.update(trigger, (trigger) => {
        trigger.spec = undefined;
      });
    }
  }, [trigger]);

  const handleValuesChanged = useCallback(
    (values: Partial<TriggerFormValues>) => {
      // Ignore changes until a kind is picked, so the unselected picker never seeds a default trigger.
      if (!values.kind) {
        return;
      }

      const spec = triggerFormSpec(values);
      setKind(spec.kind);
      // The trigger dispatches the routine's action: its `function` is the routine's `runnable` (the chosen
      // operation, or RunInstructions for an instructions action) and `triggerInput` is the action's bound
      // input. Sourcing from `runnable` (rather than the trigger's own `function`) backfills a trigger created
      // before the action was configured. `enabled` is not set here — it is toggled for the routine as a whole
      // from the toolbar.
      const functionRef = routine.runnable;
      if (trigger) {
        Obj.update(trigger, (trigger) => {
          // The subscription spec's QueryAST is deeply readonly while the live ECHO draft's `spec` is mutable;
          // the structures are identical at runtime, so a readonly->mutable boundary coercion is required here
          // (mirrors commands/trigger/update/subscription.ts).
          trigger.spec = spec as typeof trigger.spec;
          trigger.function = functionRef;
          trigger.input = triggerInput;
        });
      } else {
        // Create the trigger on first edit (disabled until enabled from the toolbar). The trigger is owned by
        // the routine (it is only reachable via it), so it is parented and cascade-deletes with it.
        const created = db.add(Trigger.make({ function: functionRef, spec, input: triggerInput }));
        Obj.setParent(created, routine);
        Obj.update(routine, (routine) => {
          routine.triggers.push(Ref.make(created));
        });
      }
    },
    [db, routine, trigger, triggerInput],
  );

  return { defaultValues, fieldMap, kind, resetNonce, handleClose, handleValuesChanged };
};
