//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { Trigger } from '@dxos/compute';
import { type Database, DXN, Feed, Filter, Obj, Query, Ref, Scope, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { IconButton, Input, ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap, type FormFieldRendererProps, SelectField } from '@dxos/react-ui-form';
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
  scheduleToCron,
  toCron,
} from '../Schedule';
import { type TriggerKind, TriggerKindSelector } from './TriggerKindSelector';

// A recurring trigger fires on a cron, so the one-time `once` kind is not offered here.
const RECURRING_KINDS = ['hourly', 'daily', 'weekly', 'monthly', 'custom'] as const satisfies readonly ScheduleKind[];

// `enabled` is extended onto every spec form so it renders inline with the kind's fields.
const EnabledForm = Type.getSchema(Trigger.Trigger).pipe(Schema.pick('enabled', 'remote'));

// Scoped trigger form, modeled as a top-level discriminated union (one member per pluggable variant) so the
// Form renders the chosen kind's fields as one flat field set (no nested, bordered sub-fieldset). The kind
// itself is chosen by `TriggerKindPicker` (a radio-card list) rather than a select. The feed field carries
// ParentLabelAnnotation so the built-in RefField labels feed options by their parent object (e.g. the mailbox).
const TimerSpecForm = Schema.extend(
  Schema.Struct({
    kind: Schema.Literal('timer'),
    cron: Schema.String.pipe(Schema.annotations({ title: 'Schedule (cron)' }), Schema.optional),
  }),
  EnabledForm,
);

const SubscriptionSpecForm = Schema.extend(
  Schema.Struct({
    kind: Schema.Literal('subscription'),
    // The object type to watch; converted to a `Filter.type` query. `typename` renders via a custom select of
    // the space/registry types (see `TypeSelectField`); `deep`/`delay` map to the subscription's options.
    typename: Schema.String.pipe(Schema.annotations({ title: 'Type' }), Schema.optional),
    deep: Schema.Boolean.pipe(Schema.annotations({ title: 'Nested' }), Schema.optional),
    delay: Schema.Number.pipe(Schema.annotations({ title: 'Delay (ms)' }), Schema.optional),
  }),
  EnabledForm,
);

const WebhookSpecForm = Schema.extend(
  Schema.Struct({
    kind: Schema.Literal('webhook'),
    method: Schema.String.pipe(Schema.annotations({ title: 'Method' }), Schema.optional),
    port: Schema.Number.pipe(Schema.annotations({ title: 'Port' }), Schema.optional),
  }),
  EnabledForm,
);

const FeedSpecForm = Schema.extend(
  Schema.Struct({
    kind: Schema.Literal('feed'),
    feed: Ref.Ref(Feed.Feed).pipe(
      ParentLabelAnnotation.set(true),
      Schema.annotations({ title: 'Feed' }),
      Schema.optional,
    ),
  }),
  EnabledForm,
);

const EmailSpecForm = Schema.extend(
  Schema.Struct({
    kind: Schema.Literal('email'),
  }),
  EnabledForm,
);

const TriggerForm = Schema.Union(TimerSpecForm, SubscriptionSpecForm, WebhookSpecForm, FeedSpecForm, EmailSpecForm);
type TriggerFormValues = Schema.Schema.Type<typeof TriggerForm>;

// Flat view of the form values: `Partial<TriggerFormValues>` collapses a discriminated union to its common
// key alone (`kind`), so reach the variant fields through this all-optional shape instead. `Partial<T>` is
// assignable to it, so handlers/helpers can accept the Form's value verbatim and still read the variant fields.
type TriggerFormInput = {
  readonly kind?: TriggerKind;
  readonly enabled?: boolean;
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
  /** Render the trigger for display only (no variant picker, clear, or field edits). */
  readonly?: boolean;
}>;

export const TriggerEditor = ({ classNames, db, routine, trigger, readonly }: TriggerEditorProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { defaultValues, fieldMap, kind, reset, handleValuesChanged } = useTriggerForm(routine, trigger);

  return (
    <>
      <Form.Root
        // Remount when the bound trigger changes or its spec kind changes (including reset to no kind),
        // so the uncontrolled form re-reads `defaultValues`; stable while editing fields within a kind.
        key={`${trigger?.id ?? 'new'}:${trigger?.spec?.kind ?? 'none'}`}
        schema={TriggerForm}
        db={db}
        readonly={readonly}
        fieldMap={fieldMap}
        defaultValues={defaultValues}
        onValuesChanged={handleValuesChanged}
      >
        {/* TODO(burdon): Generalize Form handling (indented section) for discriminated unions. */}
        <Form.Content classNames={mx(kind && 'pb-2 bg-card-surface border border-separator rounded-xs', classNames)}>
          {kind ? (
            <>
              <div className='flex items-center'>
                <Input.Root>
                  <Input.Label classNames='pl-2 grow truncate'>{t(`trigger-kind.${kind}.label`)}</Input.Label>
                </Input.Root>
                {!readonly && (
                  <IconButton
                    variant='ghost'
                    icon='ph--x--regular'
                    iconOnly
                    square
                    label={t('trigger-kind.clear.label')}
                    onClick={reset}
                  />
                )}
              </div>
              <Form.FieldSet classNames='px-2' />
            </>
          ) : (
            <Form.FieldSet />
          )}

          {/* Currently, email triggers have no configuration; surface an explanatory note instead of an empty body. */}
          {kind === 'email' && <p className='px-2 text-sm text-description'>{t('trigger-kind.email-note.message')}</p>}
        </Form.Content>
      </Form.Root>
    </>
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

  // TODO(wittjosiah): Add read-only support.
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
const useTriggerForm = (routine: Routine.Routine, trigger?: Trigger.Trigger) => {
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

  // Seed from the trigger's current spec/enabled; a trigger with no spec starts with no kind (picker).
  // Depend on `spec`/`enabled` (not just `trigger` identity) so an in-place clear/change recomputes the
  // seed — the Form re-reads it on remount (keyed by `spec.kind`), reverting to the picker on reset.
  const defaultValues = useMemo<Partial<TriggerFormValues>>(
    () => ({
      ...triggerFormValues(trigger?.spec),
      enabled: trigger?.enabled,
      remote: trigger?.remote,
    }),
    [trigger, trigger?.spec, trigger?.enabled, trigger?.remote],
  );

  // Mirror the active kind: gates the variant picker (shown only while unset) and the variant-specific notes.
  const [kind, setKind] = useState<TriggerKind | undefined>(() => triggerFormValues(trigger?.spec).kind);

  // Revert the kind selection: clear the trigger's spec. Clearing changes `spec.kind`, which is part of
  // the Form's `key`, so the form remounts and re-reads `defaultValues` (picker reappears) — no nonce needed.
  const reset = useCallback(() => {
    setKind(undefined);
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
      // `triggerFormSpec` maps `values.kind` 1:1 onto `spec.kind`; use the already-narrowed form kind so
      // the state stays typed as the selectable `TriggerKind` subset (the wider `Trigger.Spec` union now
      // also carries the invoke-only `manual` kind, which the form never produces).
      setKind(values.kind);
      const enabled = values.enabled === true;
      const remote = values.remote;
      // Edit the spec, `enabled`, and `remote` on the trigger directly from the form values.
      // The trigger's `function` and `input` (including the instructions binding and any operation-specific
      // bindings like `{ magazine }`) are wired once by `Routine.make`, so they are not re-derived here.
      if (trigger) {
        Obj.update(trigger, (trigger) => {
          // The subscription spec's QueryAST is deeply readonly while the live ECHO draft's `spec` is mutable;
          // the structures are identical at runtime, so a readonly->mutable boundary coercion is required here
          // (mirrors commands/trigger/update/subscription.ts).
          trigger.spec = spec as typeof trigger.spec;
          trigger.enabled = enabled;
          trigger.remote = remote;
        });
      } else {
        // Defensive: the draft normally carries an owned trigger already (see `Routine.make`). If absent,
        // create one in memory and attach it to the routine graph — nothing is persisted until save.
        const created = Trigger.make({ spec, enabled, remote });
        Obj.setParent(created, routine);
        Obj.update(routine, (routine) => {
          routine.triggers.push(Ref.make(created));
        });
        // Wire the new trigger's `function`/`input` to dispatch the routine's action (RunInstructions binds the
        // owned instructions; an operation binds directly).
        Routine.wireTriggers(routine);
      }
    },
    [routine, trigger],
  );

  return {
    defaultValues,
    fieldMap,
    kind,
    reset,
    handleValuesChanged,
  };
};
