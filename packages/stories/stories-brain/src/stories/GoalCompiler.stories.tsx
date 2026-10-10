//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useCallback, useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { AiService, Provider } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import * as CompilePrompt from '@dxos/brain/CompilePrompt';
import * as Compiler from '@dxos/brain/Compiler';
import { REFERENCE, SCENARIOS } from '@dxos/brain/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import * as Layout from '@dxos/react-ui/Layout';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations } from '@dxos/react-ui/translations';

import {
  CUSTOM_EXAMPLE,
  GoalPanel,
  type ReplayEvent,
  type ReplayMode,
  ReplayPanel,
  RulesPanel,
  replayCustom,
  replayScenario,
} from '../components/index.ts';

const EDGE_MODEL = 'com.anthropic.model.claude-sonnet-5.default';
const OLLAMA_MODEL = 'com.meta.model.llama-3-2-3b.instruct';

/** Creation time of a goal that matches no example. */
const CUSTOM_CREATED_AT = '2027-01-04T09:00:00Z';

const EXAMPLES = [
  { value: CUSTOM_EXAMPLE, label: 'Custom goal' },
  ...SCENARIOS.map(({ n, goal }) => ({ value: String(n), label: `${n}. ${goal}` })),
];

type StoryArgs = {
  ai: { preset: 'edge-remote' | 'ollama' };
  /** Example scenario number preloaded into the goal column. */
  example?: number;
};

/** Asks the model to compile a goal; the reply is parsed by the caller and the rules re-checked on every edit. */
const compileGoal = (goal: CompilePrompt.Goal, ollama: boolean) =>
  LanguageModel.generateText({
    prompt: [
      { role: 'system' as const, content: CompilePrompt.SYSTEM_PROMPT },
      { role: 'user' as const, content: [{ type: 'text' as const, text: CompilePrompt.userMessage(goal) }] },
    ],
  }).pipe(
    Effect.map(({ text }) => text),
    Effect.provide(
      (ollama
        ? AiService.languageModel(OLLAMA_MODEL, { provider: Provider.ollama.id })
        : AiService.languageModel(EDGE_MODEL)
      ).pipe(Layer.provide(Layer.fresh(AiServiceTestingPreset(ollama ? 'ollama' : 'edge-remote')))),
    ),
  );

const DefaultStory = ({ ai, example: initialExample }: StoryArgs) => {
  const initial = SCENARIOS.find(({ n }) => n === initialExample);
  const [example, setExample] = useState(initial ? String(initial.n) : CUSTOM_EXAMPLE);
  const [goal, setGoal] = useState(initial?.goal ?? '');
  const [instructions, setInstructions] = useState(initial?.context ?? '');
  const [ollama, setOllama] = useState(ai.preset === 'ollama');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [reply, setReply] = useState<CompilePrompt.Reply>();
  const [source, setSource] = useState('');
  const [mode, setMode] = useState<ReplayMode>(initial ? 'scenario' : 'custom');
  const [cursor, setCursor] = useState(0);
  const [events, setEvents] = useState<ReplayEvent[]>([]);

  const scenario = useMemo(() => SCENARIOS.find((candidate) => candidate.goal === goal.trim()), [goal]);
  const diagnostics = useMemo(() => Compiler.compile(source).diagnostics, [source]);
  const replay = useMemo(
    () =>
      mode === 'scenario' && scenario
        ? replayScenario(scenario, source)
        : replayCustom(source, scenario?.createdAt ?? CUSTOM_CREATED_AT, events),
    [mode, scenario, source, events],
  );

  const handleExampleChange = useCallback((value: string) => {
    const selected = SCENARIOS.find(({ n }) => String(n) === value);
    setExample(value);
    setGoal(selected?.goal ?? '');
    setInstructions(selected?.context ?? '');
    setReply(undefined);
    setError(undefined);
    setSource('');
    setMode(selected ? 'scenario' : 'custom');
    setCursor(0);
    setEvents([]);
  }, []);

  const handleCompile = useCallback(() => {
    setBusy(true);
    setError(undefined);
    void EffectEx.runPromise(
      compileGoal(
        {
          goal: goal.trim(),
          instructions,
          owner: scenario?.owner ?? 'rich',
          now: scenario?.createdAt ?? new Date().toISOString(),
          session: scenario?.session,
        },
        ollama,
      ),
    )
      .then((text) => {
        const compiled = CompilePrompt.parseReply(text);
        setReply(compiled);
        setSource(compiled.datalog);
        setCursor(0);
        setEvents([]);
      })
      .catch((failure) => setError(failure instanceof Error ? failure.message : String(failure)))
      .finally(() => setBusy(false));
  }, [goal, instructions, scenario, ollama]);

  const reference = scenario ? REFERENCE[scenario.n] : undefined;

  return (
    <Layout.Grid cols={3} grow>
      <GoalPanel
        classNames='border-e border-separator'
        examples={EXAMPLES}
        example={example}
        goal={goal}
        instructions={instructions}
        ollama={ollama}
        busy={busy}
        error={error}
        reply={reply}
        onExampleChange={handleExampleChange}
        onGoalChange={setGoal}
        onInstructionsChange={setInstructions}
        onOllamaChange={setOllama}
        onCompile={handleCompile}
      />
      <RulesPanel
        classNames='border-e border-separator'
        source={source}
        diagnostics={diagnostics}
        onSourceChange={setSource}
        onLoadReference={reference === undefined ? undefined : () => setSource(reference)}
      />
      <ReplayPanel
        mode={scenario ? mode : 'custom'}
        scenarioAvailable={scenario !== undefined}
        replay={replay}
        hasRules={source.trim().length > 0}
        cursor={cursor}
        onModeChange={setMode}
        onStep={() => setCursor((previous) => previous + 1)}
        onRunAll={() => setCursor(replay.steps.length)}
        onReset={() => {
          setCursor(0);
          setEvents([]);
        }}
        onAddFact={(fact) => setEvents((previous) => [...previous, { type: 'fact', fact }])}
        onAdvance={(duration) => setEvents((previous) => [...previous, { type: 'advance', duration }])}
      />
    </Layout.Grid>
  );
};

const meta = {
  title: 'stories/stories-brain/GoalCompiler',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    controls: { disable: true },
    translations: [...translations, ...editorTranslations, ...formTranslations],
  },
  args: {
    ai: { preset: 'edge-remote' },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Test:
 * 1. Pick example 3 and press Compile (edge model): the Rules column fills and shows "Rules compile".
 * 2. Step through the replay: every step shows its facts, expected and actual results, and passes.
 * 3. Delete `polarity(F, "+")` from the achieved rule: step s2 (the refusal) turns red without a model call.
 * 4. Switch the replay to Custom, add the default fact and advance the clock: wakes and achieved update live.
 */
export const Default: Story = {};

export const Ollama: Story = {
  args: {
    ai: { preset: 'ollama' },
  },
};

/** 1. Test: goal 3's reference rules compile and replay with every step passing, without a model call. */
export const ReferenceReplayTest: Story = {
  args: {
    example: 3,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scenario = SCENARIOS.find(({ n }) => n === 3);

    // 2. Load the reference compilation into the Rules column.
    await userEvent.click(await canvas.findByTestId('goal-compiler.load-reference'));

    // 3. The rules compile.
    await waitFor(() => expect(canvas.getByTestId('goal-compiler.diagnostics')).toHaveAttribute('data-count', '0'));
    await expect(canvas.getByText('Rules compile')).toBeInTheDocument();

    // 4. Replay every step.
    await userEvent.click(canvas.getByTestId('goal-compiler.run-all'));

    // 5. Every step passes, and so does the scenario as a whole.
    const steps = await canvas.findAllByTestId('goal-compiler.step');
    await expect(steps).toHaveLength(scenario?.steps.length ?? -1);
    for (const step of steps) {
      await expect(step).toHaveAttribute('data-status', 'pass');
    }
    await expect(canvas.getByTestId('goal-compiler.summary')).toHaveAttribute('data-status', 'pass');
  },
};
