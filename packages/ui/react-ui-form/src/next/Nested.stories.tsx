//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Next } from '@dxos/react-ui/next';
import { withTheme } from '@dxos/react-ui/testing';

import { Form as CurrentForm } from '../components/Form/Form.tsx';
import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { Form } from './Form.tsx';
import { makeNestedSchema } from './testing.ts';

const DEPTH = 5;

type StoryArgs = PaneArgs & { fields?: number; size?: Next.PanelRootProps['size'] };

/** Nested objects as nested Fieldsets, each a subgrid of the form, five levels deep. */
const DefaultStory = ({ fields = 2, size }: StoryArgs) => {
  const schema = useMemo(() => makeNestedSchema(DEPTH, fields), [fields]);
  const [values, setValues] = useState({});
  return (
    <Next.Panel.Root size={size}>
      <Next.Panel.Body>
        <Form.Root schema={schema} values={values} onValuesChanged={(next) => setValues(next)}>
          <Form.Content>
            <Form.Fields />
          </Form.Content>
        </Form.Root>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

type Impl = 'next' | 'current';

type Timing = { impl: Impl; mount: number; layout: number };

/**
 * Mounts the same depth-5 schema with either implementation and times the commit (click to layout effect) and a forced
 * layout after it; the play test adds a keystroke's re-render and relayout.
 */
const BenchmarkStory = ({ fields = 83 }: StoryArgs) => {
  const schema = useMemo(() => makeNestedSchema(DEPTH, fields), [fields]);
  const [impl, setImpl] = useState<Impl>();
  const [values, setValues] = useState({});
  const [timings, setTimings] = useState<Timing[]>([]);
  const startRef = useRef(0);
  const hostRef = useRef<HTMLDivElement>(null);

  // A parent's layout effect runs after its children commit, so this sees the whole form mounted but not yet painted.
  useLayoutEffect(() => {
    if (!impl) {
      return;
    }
    const mounted = performance.now();
    void hostRef.current?.getBoundingClientRect();
    void hostRef.current?.ownerDocument.body.offsetHeight;
    const laidOut = performance.now();
    setTimings((previous) => [...previous, { impl, mount: mounted - startRef.current, layout: laidOut - mounted }]);
  }, [impl]);

  const mount = (next: Impl | undefined) => {
    startRef.current = performance.now();
    setValues({});
    setImpl(next);
  };

  return (
    <Next.Panel.Root>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Button label='Next' onClick={() => mount('next')} data-testid='mount-next' />
          <Next.Button label='Current' onClick={() => mount('current')} data-testid='mount-current' />
          <Next.Button label='Unmount' onClick={() => mount(undefined)} data-testid='unmount' />
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body ref={hostRef}>
        {impl === 'next' && (
          <Form.Root schema={schema} values={values} onValuesChanged={(next) => setValues(next)} testId='bench-form'>
            <Form.Content>
              <Form.Fields />
            </Form.Content>
          </Form.Root>
        )}
        {impl === 'current' && (
          <CurrentForm.Root
            schema={schema}
            values={values}
            onValuesChanged={(next) => setValues(next)}
            testId='bench-form'
          >
            <CurrentForm.Viewport>
              <CurrentForm.Content>
                <CurrentForm.Fields />
              </CurrentForm.Content>
            </CurrentForm.Viewport>
          </CurrentForm.Root>
        )}
      </Next.Panel.Body>
      <Next.Panel.Footer>
        <Next.Typography data-testid='timings'>{JSON.stringify(timings)}</Next.Typography>
      </Next.Panel.Footer>
    </Next.Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/next/Nested',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane({ height: '44rem' })],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 1. Test: each nested object is an enclosed, indented group on its host's surface, its fields aligned within it. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inputs = canvas.getAllByRole('textbox');
    // 2. Two fields per level, six levels (the root and five nested groups).
    await expect(inputs).toHaveLength((DEPTH + 1) * 2);

    // 3. Both fields of a level share its track; each depth is indented by the same step on both sides.
    const boxes = inputs.map((input) => input.getBoundingClientRect());
    const step = boxes[2].left - boxes[0].left;
    await expect(step).toBeGreaterThan(4);
    for (let depth = 0; depth <= DEPTH; depth++) {
      const [first, second] = [boxes[depth * 2], boxes[depth * 2 + 1]];
      await expect(second.left).toBeCloseTo(first.left, 0);
      await expect(first.left - boxes[0].left).toBeCloseTo(depth * step, 0);
      await expect(boxes[0].right - first.right).toBeCloseTo(depth * step, 0);
    }

    // 4. Each nested group is a Fieldset (a `group` named by its legend): a bordered subgrid on its host's surface.
    const groups = canvas.getAllByRole('group', { name: /^Level / });
    await expect(groups).toHaveLength(DEPTH);
    for (const group of groups) {
      const style = getComputedStyle(group);
      await expect(style.display).toBe('grid');
      await expect(style.borderTopWidth).toBe('1px');
      await expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
      await expect(group).not.toHaveAttribute('data-surface');
    }

    // 5. A legend starts on its level's label line and ends with the disclosure at the group's inner edge.
    for (const [index, group] of groups.entries()) {
      const legend = group.querySelector<HTMLElement>(':scope > [data-part="legend"]')!.getBoundingClientRect();
      await expect(legend.left).toBeCloseTo(boxes[(index + 1) * 2].left, 0);
      const disclosure = within(group).getAllByRole('button', { name: /^Level / })[0];
      // An icon-only Button's block cell (its visible box plus the control inset) ends at the row's end.
      const cellRight = disclosure.getBoundingClientRect().right + parseFloat(getComputedStyle(disclosure).marginRight);
      await expect(cellRight).toBeCloseTo(legend.right, 0);
    }

    // 6. Fields inside a group sit closer than the form's own fields.
    await expectGroupedGap(canvasElement);

    // 7. Folding a group hides its fields.
    await userEvent.click(canvas.getByRole('button', { name: `Level ${DEPTH}` }));
    await waitFor(() => expect(canvas.getAllByRole('textbox')).toHaveLength(2));
  },
};

/** The space between two consecutive field rows. */
const rowGap = (first: Element, second: Element) =>
  second.getBoundingClientRect().top - first.getBoundingClientRect().bottom;

/** A group's fields are spaced by a tighter gap than the form's top-level fields, so they read as one group. */
const expectGroupedGap = async (canvasElement: HTMLElement) => {
  const form = canvasElement.querySelector<HTMLElement>('[role="form"]')!;
  const [topFirst, topSecond] = form.querySelectorAll(':scope > [data-scope="field"][data-part="root"]');
  const content = form.querySelector('[data-inset] > [data-scope="collapsible"][data-part="content"]')!;
  const [groupFirst, groupSecond] = content.querySelectorAll(':scope > [data-scope="field"][data-part="root"]');
  const top = rowGap(topFirst, topSecond);
  const grouped = rowGap(groupFirst, groupSecond);
  await expect(grouped).toBeGreaterThan(0);
  await expect(grouped).toBeLessThan(top);
  return { top, grouped };
};

/** 1. The grouped gap at every size. */
const groupedGapAt = (size: NonNullable<StoryArgs['size']>): Story => ({
  args: { size },
  play: async ({ canvasElement }) => {
    await expectGroupedGap(canvasElement);
  },
});

export const TestGapXs = groupedGapAt('xs');
export const TestGapSm = groupedGapAt('sm');
export const TestGapMd = groupedGapAt('md');
export const TestGapLg = groupedGapAt('lg');
export const TestGapXl = groupedGapAt('xl');

type Summary = Record<Impl, { mount: number; layout: number; keystroke: number }>;

const median = (samples: number[]) => [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)];

/** Types one character into the deepest input and times React's commit plus a forced layout. */
const timeKeystroke = async (input: HTMLInputElement) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  const start = performance.now();
  setter?.call(input, `${input.value}x`);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  // React flushes a discrete event's update in a microtask.
  await Promise.resolve();
  await Promise.resolve();
  void input.ownerDocument.body.offsetHeight;
  return performance.now() - start;
};

/** 1. Benchmark: ~500 fields at depth 5, Next vs current; the medians are logged and shown in the footer. */
export const Benchmark: Story = {
  render: BenchmarkStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const runs = 3;
    const summary = {} as Summary;
    for (const impl of ['next', 'current'] as const) {
      const keystrokes: number[] = [];
      for (let run = 0; run < runs; run++) {
        await userEvent.click(canvas.getByTestId(`mount-${impl}`));
        const form = await canvas.findByTestId('bench-form', {}, { timeout: 10_000 });
        const inputs = within(form).getAllByRole('textbox');
        const deepest = inputs[inputs.length - 1] as HTMLInputElement;
        for (let key = 0; key < 3; key++) {
          keystrokes.push(await timeKeystroke(deepest));
        }
        await userEvent.click(canvas.getByTestId('unmount'));
        await waitFor(() => expect(canvas.queryByTestId('bench-form')).toBeNull());
      }
      const timings: { impl: Impl; mount: number; layout: number }[] = JSON.parse(
        canvas.getByTestId('timings').textContent ?? '[]',
      );
      const own = timings.filter((timing) => timing.impl === impl);
      summary[impl] = {
        mount: median(own.map((timing) => timing.mount)),
        layout: median(own.map((timing) => timing.layout)),
        keystroke: median(keystrokes),
      };
    }
    // eslint-disable-next-line no-console
    console.log('[bench] depth-5 nested form', JSON.stringify(summary));
    await expect(summary.next.mount).toBeGreaterThan(0);
    await expect(summary.current.mount).toBeGreaterThan(0);
  },
};
