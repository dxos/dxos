//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Select from '@dxos/react-ui/Select';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';

import { FactForm } from './FactForm.tsx';
import { type Replay, type ReplayFact, type ReplayStep } from './replay.ts';
import { StepTable, StepTableCell, StepTableRow } from './StepTable.tsx';

export type ReplayMode = 'scenario' | 'custom';

const MODES: Select.Option[] = [
  { value: 'scenario', label: 'Scenario' },
  { value: 'custom', label: 'Custom' },
];

export type ReplayPanelProps = Util.ThemedClassName<{
  mode: ReplayMode;
  /** False when the goal matches no example scenario, which leaves only custom mode. */
  scenarioAvailable: boolean;
  replay: Replay;
  /** False while the rules are empty: there is nothing to replay against, so no steps are shown. */
  hasRules: boolean;
  /** Number of scenario steps revealed so far. */
  cursor: number;
  onModeChange: (mode: ReplayMode) => void;
  onStep: () => void;
  onRunAll: () => void;
  onReset: () => void;
  onAddFact: (fact: ReplayFact) => void;
  onAdvance: (duration: string) => void;
}>;

/**
 * Replay column: steps an example scenario through the rules, showing per step the facts, the expected and actual
 * wake/achieved/holds/blocks and the facts behind each wake; custom mode replays user-entered facts and clock advances.
 */
export const ReplayPanel = ({
  classNames,
  mode,
  scenarioAvailable,
  replay,
  hasRules,
  cursor,
  onModeChange,
  onStep,
  onRunAll,
  onReset,
  onAddFact,
  onAdvance,
}: ReplayPanelProps) => {
  const scenario = mode === 'scenario';
  const ready = hasRules && !replay.error;
  const steps = !ready ? [] : scenario ? replay.steps.slice(0, cursor) : replay.steps;
  const done = ready && scenario && replay.steps.length > 0 && cursor >= replay.steps.length;

  return (
    <Panel.Root classNames={classNames}>
      <Panel.Header>
        <Toolbar.Root>
          <Select.Root
            items={scenarioAvailable ? MODES : MODES.filter(({ value }) => value === 'custom')}
            value={[mode]}
            onValueChange={({ value }) => (value[0] === 'scenario' || value[0] === 'custom') && onModeChange(value[0])}
          >
            <Select.Trigger aria-label='Replay mode' fixed />
            <Select.Content>
              {MODES.map((item) => (
                <Select.Item key={item.value} item={item} />
              ))}
            </Select.Content>
          </Select.Root>
          {scenario && (
            <>
              <Button.Root
                icon='ph--skip-forward--regular'
                label='Step'
                iconOnly
                disabled={!ready || cursor >= replay.steps.length}
                onClick={onStep}
                data-testid='goal-compiler.step-next'
              />
              <Button.Root
                icon='ph--fast-forward--regular'
                label='Run all'
                iconOnly
                disabled={!ready || cursor >= replay.steps.length}
                onClick={onRunAll}
                data-testid='goal-compiler.run-all'
              />
            </>
          )}
          <Button.Root
            icon='ph--arrow-counter-clockwise--regular'
            label='Reset'
            iconOnly
            onClick={onReset}
            data-testid='goal-compiler.reset'
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport asChild>
            <Layout.Container gap='md' padBlock>
              {!scenario && ready && <FactForm onAddFact={onAddFact} onAdvance={onAdvance} />}
              {!hasRules && (
                <Status.Empty data-testid='goal-compiler.replay-empty'>
                  {scenario
                    ? 'Compile the goal, or load the reference rules, to replay this scenario.'
                    : 'Add rules to replay facts against them.'}
                </Status.Empty>
              )}
              {hasRules && replay.error && (
                <Banner.Root valence='error'>
                  <Banner.Title>Rules do not compile</Banner.Title>
                  <Banner.Body>{replay.error}</Banner.Body>
                </Banner.Root>
              )}
              {steps.map((step) => (
                <StepCard key={step.id} step={step} />
              ))}
            </Layout.Container>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
      <Panel.Footer>
        {done && (
          <Banner.Root
            valence={replay.failures.length === 0 ? 'success' : 'error'}
            data-testid='goal-compiler.summary'
            data-status={replay.failures.length === 0 ? 'pass' : 'fail'}
          >
            <Banner.Title>
              {replay.failures.length === 0 ? 'Every expectation holds' : `${replay.failures.length} failed`}
            </Banner.Title>
            {replay.failures.length > 0 && <Banner.Body>{replay.failures.join('\n')}</Banner.Body>}
          </Banner.Root>
        )}
      </Panel.Footer>
    </Panel.Root>
  );
};

const STATUS_ICON: Record<ReplayStep['status'], { icon: string; valence?: 'success' | 'error' }> = {
  pass: { icon: 'ph--check-circle--regular', valence: 'success' },
  fail: { icon: 'ph--x-circle--regular', valence: 'error' },
  info: { icon: 'ph--circle--regular' },
};

/** One step as a card: its title and time, the facts it adds, and the expected and actual outcome. */
const StepCard = ({ step }: { step: ReplayStep }) => {
  const { icon, valence } = STATUS_ICON[step.status];
  return (
    <Card.Root grid data-testid='goal-compiler.step' data-step={step.id} data-status={step.status}>
      <Card.Row
        leading={<Icon.Icon icon={icon} valence={valence} />}
        trailing={
          step.status !== 'info' && <Tag.Tag hue={step.status === 'pass' ? 'success' : 'error'}>{step.status}</Tag.Tag>
        }
      >
        <Card.Title>
          {step.id} · {step.note}
        </Card.Title>
      </Card.Row>
      <Card.Section>
        <Card.Text variant='muted'>{step.at}</Card.Text>
        {step.facts.map((fact) => (
          <FactTable key={fact.id} fact={fact} />
        ))}
        {step.actions.map((action) => (
          <Card.Text key={action}>action {action}</Card.Text>
        ))}
        <OutcomeTable step={step} />
        {step.failures.map((failure) => (
          <Card.Text key={failure}>✗ {failure}</Card.Text>
        ))}
      </Card.Section>
    </Card.Root>
  );
};

const PROPERTIES = ['wake', 'achieved', 'holds', 'blocks'] as const;

/** An expectation cell: absent (`—`) when the step does not check it, `either` when it is explicitly unconstrained. */
const formatExpected = (value: boolean | null | undefined): string =>
  value === undefined ? '—' : value === null ? 'either' : String(value);

/** The wake cell names each wake with the facts behind it (`reply←f1`); other cells are the plain value. */
const formatActual = (step: ReplayStep, property: (typeof PROPERTIES)[number]): string =>
  property === 'wake'
    ? step.wakes.length === 0
      ? 'false'
      : step.wakes.map(({ label, facts }) => (facts.length > 0 ? `${label}←${facts.join(',')}` : label)).join(' ')
    : String(step[property]);

/** Expected against actual for each checked property; an actual that contradicts its expectation reads as an error. */
const OutcomeTable = ({ step }: { step: ReplayStep }) => (
  <StepTable columns={['Expected', 'Actual']} data-testid='goal-compiler.outcome'>
    {PROPERTIES.map((property) => {
      const expected = step.expected?.[property];
      const actual = property === 'wake' ? step.wakes.length > 0 : step[property];
      const mismatch = typeof expected === 'boolean' && expected !== actual;
      return (
        <StepTableRow key={property} label={property} data-property={property}>
          <StepTableCell tone='muted'>{formatExpected(expected)}</StepTableCell>
          <StepTableCell tone={mismatch ? 'error' : undefined} data-mismatch={mismatch ? '' : undefined}>
            {mismatch && '✗ '}
            {formatActual(step, property)}
          </StepTableCell>
        </StepTableRow>
      );
    })}
  </StepTable>
);

/** Fact fields in reading order: the proposition first, then how and by whom it was said. */
const FACT_FIELDS = ['id', 'subject', 'predicate', 'object', 'force', 'polarity', 'speaker', 'quote'] as const;

/** One fact as key/value rows, skipping fields it does not carry. */
const FactTable = ({ fact }: { fact: ReplayStep['facts'][number] }) => (
  <StepTable data-testid='goal-compiler.fact' data-fact={fact.id}>
    {FACT_FIELDS.flatMap((field) => {
      const value = fact[field];
      return value === undefined || value === ''
        ? []
        : [
            <StepTableRow key={field} label={field}>
              <StepTableCell tone={field === 'quote' ? 'muted' : undefined}>
                {field === 'quote' ? `“${value}”` : value}
              </StepTableCell>
            </StepTableRow>,
          ];
    })}
  </StepTable>
);
