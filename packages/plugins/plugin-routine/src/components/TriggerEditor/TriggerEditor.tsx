//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { DXN, Feed, Filter, Obj, Query, Ref, Scope, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { SchemaAST } from '@dxos/effect';
import { IconButton, Input, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap, type FormFieldRendererProps, SelectField, useFormValues } from '@dxos/react-ui-form';
import { ParentLabelAnnotation } from '@dxos/schema';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { wireTriggers } from '../../util';
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
// `SchemaAST` rather than `mapFields`/`fieldsAssign`: `Type.getSchema` returns a `Codec`, which
// carries no field literals for a struct operation.
const EnabledFields = SchemaAST.pick(Type.getSchema(Trigger.Trigger).ast, ['enabled', 'remote']);

const withEnabled = (fields: Schema.Struct.Fields): Schema.Codec<any, any> =>
  Schema.make<Schema.Codec<any, any>>(SchemaAST.assignFields(Schema.Struct(fields).ast, EnabledFields));

// Trigger form, modeled as a discriminated union (one member per pluggable variant) so the Form renders the
// chosen kind's fields as one flat field set. The kind itself is chosen by `TriggerKindSelector` (a radio-card
// list) rather than a select. The feed field carries ParentLabelAnnotation so the built-in RefField labels feed
// options by their parent object (e.g. the mailbox).
const TimerSpecForm = withEnabled({
  kind: Schema.Literal('timer'),
  cron: Schema.String.pipe(Schema.annotate({ title: 'Schedule (cron)' }), Schema.optional),
});

const SubscriptionSpecForm = withEnabled({
  kind: Schema.Literal('subscription'),
  // The object type to watch; converted to a `Filter.type` query. `typename` renders via a custom select of
  // the space/registry types (see `TypeSelectField`); `deep`/`delay` map to the subscription's options.
  typename: Schema.String.pipe(Schema.annotate({ title: 'Type' }), Schema.optional),
  deep: Schema.Boolean.pipe(Schema.annotate({ title: 'Nested' }), Schema.optional),
  delay: Schema.Number.pipe(Schema.annotate({ title: 'Delay (ms)' }), Schema.optional),
});

const WebhookSpecForm = withEnabled({
  kind: Schema.Literal('webhook'),
  method: Schema.String.pipe(Schema.annotate({ title: 'Method' }), Schema.optional),
  port: Schema.Number.pipe(Schema.annotate({ title: 'Port' }), Schema.optional),
});

const FeedSpecForm = withEnabled({
  kind: Schema.Literal('feed'),
  feed: Ref.Ref(Feed.Feed).pipe(ParentLabelAnnotation.set(true), Schema.annotate({ title: 'Feed' }), Schema.optional),
});

const EmailSpecForm = withEnabled({
  kind: Schema.Literal('email'),
});

export const TriggerForm = Schema.Union([
  TimerSpecForm,
  SubscriptionSpecForm,
  WebhookSpecForm,
  FeedSpecForm,
  EmailSpecForm,
]);
export type TriggerFormValues = Schema.Schema.Type<typeof TriggerForm>;

/**
 * Flat view of the form values: `Partial<TriggerFormValues>` collapses a discriminated union to its common
 * key alone (`kind`), so reach the variant fields through this all-optional shape instead. `Partial<T>` and
 * the union itself are assignable to it, so handlers/helpers can accept the Form's value verbatim and still
 * read the variant fields.
 */
export type TriggerFormInput = {
  readonly kind?: TriggerKind;
  readonly enabled?: boolean;
  readonly remote?: boolean;
  readonly cron?: string;
  readonly method?: string;
  readonly port?: number;
  readonly feed?: Ref.Ref<Feed.Feed>;
  readonly typename?: string;
  readonly deep?: boolean;
  readonly delay?: number;
};

/**
 * Project a trigger spec onto the form's discriminated-union members. Returns `undefined` when there is no
 * spec (or an invoke-only kind like `manual`), so the caller seeds no trigger value and the editor shows the
 * variant picker.
 */
export const triggerFormValues = (spec?: Trigger.Spec): TriggerFormValues | undefined => {
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
      return undefined;
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

/**
 * Apply the trigger section's form values to the routine graph: edit the primary trigger's spec/`enabled`/
 * `remote` in place, or (defensively) create-and-wire an owned trigger on first edit — the draft normally
 * carries one already (see `makeRoutine`); nothing extra is persisted until the enclosing graph is added.
 * Changes are ignored until a kind is picked, so the unselected picker never seeds a default trigger.
 */
export const applyTriggerValues = (
  routine: Routine.Routine,
  trigger: Trigger.Trigger | undefined,
  values: TriggerFormInput | undefined,
): void => {
  if (!values?.kind) {
    return;
  }

  const spec = triggerFormSpec(values);
  // Fall back to the trigger's stored state: a spec-less trigger (`manual`, or cleared) seeds no form
  // values, so a kind picked afterwards must not silently disable it or strip its EDGE routing.
  const enabled = values.enabled ?? trigger?.enabled ?? false;
  const remote = values.remote ?? trigger?.remote;
  // The trigger's `function` and `input` (including the instructions binding and any operation-specific
  // bindings like `{ magazine }`) are wired once by `makeRoutine`, so they are not re-derived here.
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
    const created = Trigger.make({ spec, enabled, remote });
    Obj.update(routine, (routine) => {
      routine.triggers.push(Ref.make(created));
    });
    // Wire the new trigger's `function`/`input` to dispatch the routine's action (RunInstructions binds the
    // owned instructions; an operation binds directly).
    wireTriggers(routine);
  }
};

//
// Custom fields
//

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

const methodOptions = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
];

/**
 * Custom fields for the trigger section, keyed by json path within the composite routine form
 * (the trigger values live under `trigger`).
 */
export const triggerFieldMap: FormFieldMap = {
  // Show the variant picker only until a kind is chosen; once selected the row is replaced by that
  // variant's editor (the kind field renders nothing).
  'trigger.kind': (props) =>
    props.getValue() ? null : <TriggerKindSelector onChange={(next) => props.onValueChange(props.type, next)} />,
  'trigger.cron': (props) => <CronField {...props} />,
  'trigger.method': (props) => <SelectField {...props} options={methodOptions} />,
  'trigger.typename': (props) => <TypeSelectField {...props} />,
};

//
// Section
//

const TRIGGER_PATH = ['trigger'];

export type TriggerSectionProps = {
  /** Render the trigger for display only (no variant picker, clear, or field edits). */
  readonly?: boolean;
  /** Clear the trigger's spec — the enclosing form re-seeds and the variant picker reappears. */
  onClear?: () => void;
};

/**
 * The trigger section of the composite routine form: renders the trigger sub-tree of the enclosing
 * `Form.Root` (`TriggerForm` at the `trigger` path) with the active kind's label row and clear affordance.
 * Must be rendered inside a form whose schema nests {@link TriggerForm} at `trigger` and whose `fieldMap`
 * includes {@link triggerFieldMap}.
 */
export const TriggerSection = ({ readonly, onClear }: TriggerSectionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const values = useFormValues<TriggerFormInput>('TriggerEditor.TriggerSection', TRIGGER_PATH);
  const kind = values?.kind;

  return (
    <div className={mx('flex flex-col', kind && 'pb-2 dx-card-surface border border-separator rounded-xs')}>
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
                onClick={onClear}
              />
            )}
          </div>
          <Form.FieldSet path={TRIGGER_PATH} schema={TriggerForm} classNames='px-2' />
        </>
      ) : (
        <Form.FieldSet path={TRIGGER_PATH} schema={TriggerForm} />
      )}

      {/* Currently, email triggers have no configuration; surface an explanatory note instead of an empty body. */}
      {kind === 'email' && <p className='px-2 text-sm text-description'>{t('trigger-kind.email-note.message')}</p>}
    </div>
  );
};

TriggerSection.displayName = 'TriggerEditor.TriggerSection';
