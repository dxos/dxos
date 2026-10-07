//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import { Form } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Select from '@dxos/react-ui/Select';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type ReplayFact } from './replay.ts';

// Descriptions double as the fields' placeholders, so they say what goes in each rather than giving an example.
const FactSchema = Schema.Struct({
  speaker: Schema.String.annotate({ title: 'Speaker', description: 'Who said it' }),
  quote: Schema.String.annotate({ title: 'Quote', description: 'What was said' }),
  subject: Schema.String.annotate({ title: 'Subject', description: 'Entity the fact is about' }),
  predicate: Schema.String.annotate({ title: 'Predicate', description: 'Relation' }),
  object: Schema.String.annotate({ title: 'Object', description: 'Entity or value' }),
  force: Schema.optional(
    Schema.Literals(['assertive', 'directive', 'commissive', 'expressive']).annotate({
      title: 'Force',
      description: 'Kind of speech act',
    }),
  ),
  polarity: Schema.optional(
    Schema.Literals(['+', '-', '?']).annotate({
      title: 'Polarity',
      description: 'Affirmed (+), denied (-) or uncertain (?)',
    }),
  ),
});

type FactDraft = Schema.Schema.Type<typeof FactSchema>;

const EMPTY_FACT: FactDraft = { speaker: '', quote: '', subject: '', predicate: '', object: '' };

/** The draft as a fact once every field the replay needs is set. */
const toFact = ({ force, polarity, ...fields }: FactDraft): ReplayFact | undefined =>
  force && polarity && fields.speaker.trim() && fields.subject.trim() && fields.predicate.trim() && fields.object.trim()
    ? { ...fields, force, polarity }
    : undefined;

const DURATIONS: Select.Option[] = ['1h', '12h', '1d', '2d', '1w'].map((value) => ({ value, label: value }));

export type FactFormProps = {
  disabled?: boolean;
  onAddFact: (fact: ReplayFact) => void;
  onAdvance: (duration: string) => void;
};

/** Custom replay input: a fact to append, or a duration to advance the clock by. */
export const FactForm = ({ disabled, onAddFact, onAdvance }: FactFormProps) => {
  const [draft, setDraft] = useState<FactDraft>(EMPTY_FACT);
  const [duration, setDuration] = useState('1d');
  const fact = toFact(draft);

  return (
    <>
      <Toolbar.Root>
        <Button.Root
          icon='ph--plus--regular'
          label='Add fact'
          disabled={disabled || !fact}
          onClick={() => fact && onAddFact(fact)}
          data-testid='goal-compiler.add-fact'
        />
        <Toolbar.Separator />
        <Select.Root
          items={DURATIONS}
          value={[duration]}
          onValueChange={({ value }) => value[0] && setDuration(value[0])}
        >
          <Select.Trigger aria-label='Advance by' fixed />
          <Select.Content>
            {DURATIONS.map((item) => (
              <Select.Item key={item.value} item={item} />
            ))}
          </Select.Content>
        </Select.Root>
        <Button.Root
          icon='ph--clock-clockwise--regular'
          label='Advance clock'
          disabled={disabled}
          onClick={() => onAdvance(duration)}
          data-testid='goal-compiler.advance'
        />
      </Toolbar.Root>
      <Form.Root
        schema={FactSchema}
        values={draft}
        onValuesChanged={(values) => setDraft((previous) => ({ ...previous, ...values }))}
      >
        <Form.Content>
          <Form.Fields />
        </Form.Content>
      </Form.Root>
    </>
  );
};
