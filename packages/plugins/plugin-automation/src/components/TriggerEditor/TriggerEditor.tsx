//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { Trigger } from '@dxos/compute';
import { type Database, Feed, Obj, Ref } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldRendererProps, type FormFieldMap, SelectField } from '@dxos/react-ui-form';
import { ParentLabelAnnotation } from '@dxos/schema';

import { meta } from '#meta';
import { Automation } from '#types';

import { type CronSpecType, CronBuilder, FrequencyDefaults, describeCron, fromCron, toCron } from '../CronBuilder';

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

export type TriggerEditorProps = {
  db: Database.Database;
  automation: Automation.Automation;
  trigger?: Trigger.Trigger;
};

export const TriggerEditor = ({ db, automation, trigger }: TriggerEditorProps) => {
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

CronField.displayName = 'TriggerEditor.CronField';

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
