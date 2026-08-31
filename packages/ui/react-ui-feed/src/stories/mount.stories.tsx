//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { MessageList } from '../components';
import { useFeedModel } from '../model';
import { type FeedScenario, type ScenarioDefinition, createScenario } from '../testing';

/**
 * What one mounted row costs, with the fixtures already built.
 *
 * `baseline/fill` can only watch from the first frame a play function gets, and its numbers carry
 * whatever the story did before that — generating five hundred messages, most of all. Here the
 * scenarios are built once, before anything is timed, and each feed is then mounted and torn down
 * repeatedly. What is left is the cost of putting rows on screen.
 */
const SCENARIOS: FeedScenario[] = [
  'plain',
  'uniform-text',
  'uniform-bare',
  'uniform-themed',
  'uniform-markdown',
  'uniform-decorated',
  'uniform-item',
  'uniform',
  'assistant',
];

/** Warm-up mounts, discarded: the first feed of a run pays for style sheets the rest reuse. */
const WARMUP = 1;

/** Frames of an unchanged row count before a mount counts as complete. */
const STABLE_FRAMES = 3;

const MAX_FRAMES = 240;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

type Result = {
  scenario: FeedScenario;
  /** Rows the virtualizer mounted to cover the viewport. */
  rows: number;
  /** Mean milliseconds from mount until the row count stops changing. */
  mean: number;
  worst: number;
  /**
   * Mean animation frames over the same interval.
   *
   * The number that separates the two explanations: a fill that takes as many frames as it has rows
   * is mounting them one per frame and the fix is to stop doing that, where a fill that takes a
   * handful of very long frames is doing too much work per row.
   */
  frames: number;
};

type MountProfileProps = {
  count?: number;
  runs?: number;
};

const MountProfile = ({ count = 200, runs = 3 }: MountProfileProps) => {
  // Built before anything is timed. Generating the fixtures is the story's cost, not the list's, and
  // it is the larger number of the two at this length.
  const scenarios = useMemo(
    () => Object.fromEntries(SCENARIOS.map((scenario) => [scenario, createScenario({ scenario, count })])),
    [count],
  );

  const [shown, setShown] = useState<FeedScenario | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    // Measured to the last frame that changed anything, not to the end of the loop: the trailing
    // stable frames are the sampler waiting, and charging them to the mount reports its patience.
    const settle = async (): Promise<{ elapsed: number; frames: number; rows: number; fill: number[] }> => {
      const start = performance.now();
      // Rows mounted on each frame until the count holds. A feed that fills in one commit reads as a
      // single number; anything else is the reader watching it arrive in pieces.
      const fill: number[] = [];
      let rows = 0;
      let stable = 0;
      let elapsed = 0;
      let frames = 0;
      for (let frame = 0; frame < MAX_FRAMES && stable < STABLE_FRAMES; frame++) {
        await nextFrame();
        const mounted = containerRef.current?.querySelectorAll('[data-index]').length ?? 0;
        if (mounted > 0 && mounted === rows) {
          stable += 1;
        } else {
          stable = 0;
          elapsed = performance.now() - start;
          frames = frame + 1;
          fill.push(mounted);
        }

        rows = mounted;
      }

      return { elapsed, frames, rows, fill };
    };

    void (async () => {
      const measured: Result[] = [];
      for (const scenario of SCENARIOS) {
        const times: number[] = [];
        const frames: number[] = [];
        let rows = 0;
        for (let run = 0; run < runs + WARMUP && !cancelled; run++) {
          setShown(scenario);
          const settled = await settle();
          rows = settled.rows;
          if (run >= WARMUP) {
            times.push(settled.elapsed);
            frames.push(settled.frames);
            // eslint-disable-next-line no-console
            console.log(`[fill: ${scenario}]`, JSON.stringify(settled.fill));
          }

          setShown(null);
          await nextFrame();
        }

        if (cancelled) {
          return;
        }

        measured.push({
          scenario,
          rows,
          mean: mean(times),
          worst: Math.max(...times),
          frames: mean(frames),
        });
      }

      setResults(measured);
      // eslint-disable-next-line no-console
      console.log(`[mount: ${count} messages]\n` + format(measured));
    })();

    return () => {
      cancelled = true;
    };
  }, [scenarios, runs, count]);

  const definition = shown ? scenarios[shown] : undefined;

  return (
    <div className='flex flex-col h-full'>
      <pre className='p-4 text-xs whitespace-pre' data-testid='mount.results'>
        {results.length ? format(results) : 'measuring…'}
      </pre>
      <div ref={containerRef} className='relative grow min-h-0'>
        {definition && <Mounted key={shown} definition={definition} />}
      </div>
    </div>
  );
};

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

const format = (results: Result[]): string => {
  const header = ['scenario', 'rows', 'mean ms', 'worst ms', 'ms/row', 'frames', 'ms/frame'];
  const body = results.map(({ scenario, rows, mean, worst, frames }) => [
    scenario,
    String(rows),
    mean.toFixed(1),
    worst.toFixed(1),
    (mean / Math.max(1, rows)).toFixed(2),
    frames.toFixed(1),
    (mean / Math.max(1, frames)).toFixed(1),
  ]);
  const widths = header.map((_, column) => Math.max(...[header, ...body].map((row) => row[column].length)));

  return [header, ...body].map((row) => row.map((cell, column) => cell.padEnd(widths[column])).join('  ')).join('\n');
};

/** One scenario mounted through the real Root; a component so the model hook has somewhere to live. */
const Mounted = ({ definition }: { definition: ScenarioDefinition }) => {
  const model = useFeedModel(definition.messages);
  return (
    <MessageList.Root
      model={model}
      renderer={definition.renderer}
      registry={definition.registry}
      Chrome={definition.Chrome}
      Custom={definition.Custom}
      estimateSize={definition.estimateSize}
      stickyBottom={definition.stickyBottom}
    >
      <MessageList.Viewport classNames='absolute inset-0' padding />
    </MessageList.Root>
  );
};

const meta: Meta<MountProfileProps> = {
  title: 'ui/react-ui-feed/stories/mount',
  component: MountProfile,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<MountProfileProps>;

/**
 * Per-row mount cost up the ladder.
 *
 * `plain` has no editor at all, `uniform` adds one identical editor per row, `assistant` adds
 * per-message renderers and block widgets. `ms/row` is the number that decides whether the first
 * fill is worth optimizing in the item or in the list.
 */
export const Default: Story = { args: { count: 200 }, play: waitForResults };

/** The same rows in a shorter feed: anything that changes here scales with the model, not the view. */
export const Short: Story = { args: { count: 50 }, play: waitForResults };

// The measurement runs in the component, so the test's only job is to still be there when it
// finishes — the numbers are printed, not asserted: a threshold on a shared CI machine is noise.
async function waitForResults({ canvasElement }: { canvasElement: HTMLElement }) {
  const results = within(canvasElement).getByTestId('mount.results');
  await waitFor(() => expect(results.textContent).toContain('ms/row'), { timeout: 60_000 });
}
