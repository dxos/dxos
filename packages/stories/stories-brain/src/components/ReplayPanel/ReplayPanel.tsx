//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import * as Listbox from '@dxos/react-ui/Listbox';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Select from '@dxos/react-ui/Select';
import * as Tag from '@dxos/react-ui/Tag';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Typography from '@dxos/react-ui/Typography';
import type * as Util from '@dxos/react-ui/Util';

import { FactForm } from './FactForm.tsx';
import { type Replay, type ReplayFact, type ReplayStep } from './replay.ts';

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
  cursor,
  onModeChange,
  onStep,
  onRunAll,
  onReset,
  onAddFact,
  onAdvance,
}: ReplayPanelProps) => {
  const scenario = mode === 'scenario';
  const steps = scenario ? replay.steps.slice(0, cursor) : replay.steps;
  const items = useMemo(
    () => steps.map((step) => ({ value: step.id, label: `${step.id} · ${step.note}`, description: step.at })),
    [steps],
  );
  const done = scenario && replay.steps.length > 0 && cursor >= replay.steps.length;

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
                disabled={!!replay.error || cursor >= replay.steps.length}
                onClick={onStep}
                data-testid='goal-compiler.step-next'
              />
              <Button.Root
                icon='ph--fast-forward--regular'
                label='Run all'
                iconOnly
                disabled={!!replay.error || cursor >= replay.steps.length}
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
              {!scenario && <FactForm disabled={!!replay.error} onAddFact={onAddFact} onAdvance={onAdvance} />}
              {replay.error && (
                <Banner.Root valence='error'>
                  <Banner.Title>Rules do not compile</Banner.Title>
                  <Banner.Body>{replay.error}</Banner.Body>
                </Banner.Root>
              )}
              {items.length > 0 && (
                <Listbox.Root items={items} selectionMode='none'>
                  <Listbox.Content scroll={false}>
                    {steps.map((step, index) => (
                      <StepRow key={step.id} step={step} item={items[index]} />
                    ))}
                  </Listbox.Content>
                </Listbox.Root>
              )}
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
            </Layout.Container>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

const STATUS_ICON: Record<ReplayStep['status'], { icon: string; valence?: 'success' | 'error' }> = {
  pass: { icon: 'ph--check-circle--regular', valence: 'success' },
  fail: { icon: 'ph--x-circle--regular', valence: 'error' },
  info: { icon: 'ph--circle--regular' },
};

const StepRow = ({ step, item }: { step: ReplayStep; item: Listbox.Option }) => {
  const { icon, valence } = STATUS_ICON[step.status];
  return (
    <Listbox.Item item={item} data-testid='goal-compiler.step' data-step={step.id} data-status={step.status}>
      <Listbox.ItemIcon icon={icon} valence={valence} />
      <Listbox.ItemText />
      <Listbox.ItemDescription />
      {step.status !== 'info' && <Tag.Tag hue={step.status === 'pass' ? 'success' : 'error'}>{step.status}</Tag.Tag>}
      <Layout.Flex column data-place='full'>
        {step.facts.map((fact) => (
          <Typography.Text key={fact.id}>
            {fact.id} · {fact.speaker}: “{fact.quote}” ({fact.subject} {fact.predicate} {fact.object}; {fact.force},{' '}
            {fact.polarity})
          </Typography.Text>
        ))}
        {step.actions.map((action) => (
          <Typography.Text key={action} mono>
            action {action}
          </Typography.Text>
        ))}
        {step.expected && (
          <Typography.Text tone='muted' mono>
            expected {formatExpected(step.expected)}
          </Typography.Text>
        )}
        <Typography.Text mono>actual {formatActual(step)}</Typography.Text>
        {step.failures.map((failure) => (
          <Typography.Text key={failure} tone='muted' mono>
            ✗ {failure}
          </Typography.Text>
        ))}
      </Layout.Flex>
    </Listbox.Item>
  );
};

const formatExpected = (expected: NonNullable<ReplayStep['expected']>): string =>
  (['wake', 'achieved', 'holds', 'blocks'] as const)
    .flatMap((key) => (expected[key] === undefined || expected[key] === null ? [] : [`${key}=${expected[key]}`]))
    .join(' ') || 'nothing';

const formatActual = ({ wakes, achieved, holds, blocks }: ReplayStep): string =>
  [
    wakes.length === 0
      ? 'wake=false'
      : `wake ${wakes.map(({ label, facts }) => (facts.length > 0 ? `${label}←${facts.join(',')}` : label)).join(' ')}`,
    `achieved=${achieved}`,
    `holds=${holds}`,
    `blocks=${blocks}`,
  ].join(' ');
