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

const FactSchema = Schema.Struct({
  speaker: Schema.String.annotate({ title: 'Speaker' }),
  quote: Schema.String.annotate({ title: 'Quote' }),
  subject: Schema.String.annotate({ title: 'Subject' }),
  predicate: Schema.String.annotate({ title: 'Predicate' }),
  object: Schema.String.annotate({ title: 'Object' }),
  force: Schema.Literals(['assertive', 'directive', 'commissive', 'expressive']).annotate({ title: 'Force' }),
  polarity: Schema.Literals(['+', '-', '?']).annotate({ title: 'Polarity' }),
});

const DEFAULT_FACT: ReplayFact = {
  speaker: 'dima',
  quote: "OK, I'll start on the agent plugin",
  subject: 'dima',
  predicate: 'helps-with',
  object: 'agent plugin',
  force: 'commissive',
  polarity: '+',
};

const DURATIONS: Select.Option[] = ['1h', '12h', '1d', '2d', '1w'].map((value) => ({ value, label: value }));

export type FactFormProps = {
  disabled?: boolean;
  onAddFact: (fact: ReplayFact) => void;
  onAdvance: (duration: string) => void;
};

/** Custom replay input: a fact to append, or a duration to advance the clock by. */
export const FactForm = ({ disabled, onAddFact, onAdvance }: FactFormProps) => {
  const [fact, setFact] = useState<ReplayFact>(DEFAULT_FACT);
  const [duration, setDuration] = useState('1d');
  const complete = fact.speaker.trim() && fact.subject.trim() && fact.predicate.trim() && fact.object.trim();

  return (
    <>
      <Toolbar.Root>
        <Button.Root
          icon='ph--plus--regular'
          label='Add fact'
          disabled={disabled || !complete}
          onClick={() => onAddFact(fact)}
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
        values={fact}
        onValuesChanged={(values) => setFact((previous) => ({ ...previous, ...values }))}
      >
        <Form.Content>
          <Form.Fields />
        </Form.Content>
      </Form.Root>
    </>
  );
};
