//
// Copyright 2026 DXOS.org
//

import '../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent } from 'storybook/test';

import { withTheme } from '../../testing/index.ts';
import { Next } from '../Next.tsx';
import { type Size, SIZES } from '../sizes.ts';
import { SIZE_ARG_TYPES, type SizeArgs } from './stories.tsx';

const LABEL_COLUMNS = 'auto [field-start] minmax(0, 1fr)';

const OPTIONS: Next.SelectOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
];

const SizeSection = ({ size }: { size: Size }) => (
  <Next.Container size={size} gutter='rail' columns={LABEL_COLUMNS} data-testid={`section-${size}`}>
    <Next.Toolbar.Root data-testid={`toolbar-${size}`}>
      <Next.Block>
        <Next.Icon icon='ph--circle--regular' />
      </Next.Block>
      <Next.Button icon='ph--plus--regular' label='Add' iconOnly data-testid={`add-${size}`} />
      <Next.Button icon='ph--minus--regular' label='Remove' iconOnly data-testid={`remove-${size}`} />
      <Next.Button data-testid={`button-${size}`}>Save</Next.Button>
      <Next.Input placeholder='Search' aria-label='Search' data-testid={`input-${size}`} />
      <Next.Select.Root items={OPTIONS}>
        <Next.Select.Trigger placeholder='Color' aria-label='Color' data-testid={`select-${size}`} />
        <Next.Select.Content data-testid={`listbox-${size}`}>
          {OPTIONS.map((item) => (
            <Next.Select.Item key={item.value} item={item} />
          ))}
        </Next.Select.Content>
      </Next.Select.Root>
    </Next.Toolbar.Root>

    <Next.Container layout='row' data-testid={`row-${size}`}>
      <Next.Block rail='start' data-testid={`row-${size}-rail-start`}>
        <Next.Icon icon='ph--user--regular' />
      </Next.Block>
      <Next.Label htmlFor={`name-${size}`} classNames='pe-(--nx-gap-size)'>
        Name
      </Next.Label>
      <Next.Input id={`name-${size}`} data-testid={`row-input-${size}`} />
      <Next.Block rail='end'>
        <Next.Icon icon='ph--x--regular' label='Clear' />
      </Next.Block>
    </Next.Container>

    <Next.Container>
      <Next.Checkbox label='Subscribe' defaultChecked data-testid={`checkbox-${size}`} />
    </Next.Container>

    <Next.Field.Root data-testid={`field-${size}`}>
      <Next.Field.Label>Email</Next.Field.Label>
      <Next.Input data-testid={`field-input-${size}`} />
      <Next.Field.HelperText>We never share it.</Next.Field.HelperText>
    </Next.Field.Root>

    <Next.Field.Root invalid>
      <Next.Field.Label>Website</Next.Field.Label>
      <Next.Input defaultValue='not a url' />
      <Next.Field.ErrorText>Enter a valid URL.</Next.Field.ErrorText>
    </Next.Field.Root>

    <Next.Container>
      <Next.Block rail='start'>
        <Next.Icon icon='ph--chat-circle--regular' />
      </Next.Block>
      <Next.Typography>
        Typography centres its first line in the block, so the icon beside it lines up however far it wraps.
      </Next.Typography>
    </Next.Container>
  </Next.Container>
);

/** Every size by default; pick one in the properties panel by turning `allSizes` off. */
const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (
  <div className='nx-scope @container flex flex-col gap-4 w-[40rem]' data-size='md'>
    {(allSizes ? SIZES : [size]).map((size) => (
      <SizeSection key={size} size={size} />
    ))}
  </div>
);

const meta = {
  title: 'ui/react-ui-core/testing/components',
  render: DefaultStory,
  args: { size: 'md', allSizes: true },
  argTypes: { ...SIZE_ARG_TYPES, allSizes: { control: 'boolean' } },
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Cross-component gallery; per-component assertions live in each component's own stories. */
export const Default: Story = {};

/** A recognisable ring colour, so the audit can tell Next's ring from the browser's or Tailwind's. */
const AUDIT_RING = 'rgb(255, 0, 255)';

/** Tailwind forms' focus blue and the browser's default focus outline must never show on a Next part. */
const FOREIGN_RING = 'rgb(37, 99, 235)';

/** Every focusable Next control, themed with the audit ring colour. */
const FocusRingsStory = () => (
  <div className='nx-scope' data-size='md' style={{ ['--nx-focus-ring-color' as string]: AUDIT_RING }}>
    <Next.Container gutter='rail' level='base'>
      <Next.Field.Root>
        <Next.Field.Label>Input</Next.Field.Label>
        <Next.Input />
      </Next.Field.Root>
      <Next.Field.Root>
        <Next.Field.Label>Textarea</Next.Field.Label>
        <Next.Textarea />
      </Next.Field.Root>
      <Next.Field.Root>
        <Next.Field.Label>Date</Next.Field.Label>
        <Next.DateInput defaultValue='2026-09-29' />
      </Next.Field.Root>
      <Next.Field.Root>
        <Next.Field.Label>Time</Next.Field.Label>
        <Next.DateInput type='time' defaultValue='09:30' />
      </Next.Field.Root>
      <Next.Field.Root>
        <Next.Select.Root items={OPTIONS}>
          <Next.Select.Label>Select</Next.Select.Label>
          <Next.Select.Trigger placeholder='Pick one' />
          <Next.Select.Content size='md'>
            {OPTIONS.map((item) => (
              <Next.Select.Item key={item.value} item={item} />
            ))}
          </Next.Select.Content>
        </Next.Select.Root>
      </Next.Field.Root>
      <Next.Field.Root>
        <Next.Combobox.Root items={OPTIONS}>
          <Next.Combobox.Label>Combobox</Next.Combobox.Label>
          <Next.Combobox.Control>
            <Next.Combobox.Input placeholder='Search' />
            <Next.Combobox.Trigger />
          </Next.Combobox.Control>
          <Next.Combobox.Content size='md' />
        </Next.Combobox.Root>
      </Next.Field.Root>
      <Next.Checkbox label='Checkbox' />
      <Next.Switch label='Switch' />
      <Next.Collapsible.Root>
        <Next.Collapsible.Trigger>Collapsible</Next.Collapsible.Trigger>
        <Next.Collapsible.Content>
          <Next.Typography>Hidden content.</Next.Typography>
        </Next.Collapsible.Content>
      </Next.Collapsible.Root>
      <Next.Toolbar.Root>
        <Next.Button>Button</Next.Button>
        <Next.Button icon='ph--plus--regular' label='Add' iconOnly showTooltip={false} />
        <Next.Toggle icon='ph--text-b--regular' label='Bold' iconOnly showTooltip={false} />
      </Next.Toolbar.Root>
    </Next.Container>
  </div>
);

/** Colours a focused part, its immediate relatives and the control row hosting it (DateInput's segments) paint for focus. */
const focusPaint = (element: Element) =>
  [element, element.parentElement, ...(element.parentElement?.children ?? []), element.closest('.nx-control')]
    .filter((node): node is Element => node instanceof Element)
    .map((node) => {
      const style = getComputedStyle(node);
      return {
        shadow: style.boxShadow,
        outline: style.outlineStyle === 'none' ? '' : `${style.outlineStyle} ${style.outlineColor}`,
        border: parseFloat(style.borderTopWidth) > 0 ? style.borderTopColor : '',
      };
    });

/** Tabs through every control: each shows Next's ring and nothing else. */
export const FocusRings: Story = {
  render: FocusRingsStory,
  play: async ({ canvasElement }) => {
    const seen = new Set<Element>();
    for (let step = 0; step < 40; step++) {
      await userEvent.tab();
      const active = canvasElement.ownerDocument.activeElement;
      if (!active || !canvasElement.contains(active) || seen.has(active)) {
        break;
      }
      seen.add(active);
      const paint = focusPaint(active);
      const name = `${active.tagName.toLowerCase()}.${active.getAttribute('class') ?? ''}`;
      for (const { shadow, outline, border } of paint) {
        await expect(shadow, name).not.toContain(FOREIGN_RING);
        await expect(outline, name).not.toContain('auto');
        await expect(outline, name).not.toContain(FOREIGN_RING);
        await expect(border, name).not.toContain(FOREIGN_RING);
      }
      const ringed = paint.some(({ shadow, outline }) => shadow.includes(AUDIT_RING) || outline.includes(AUDIT_RING));
      // An inset shadow paints under children, so a ring host drawn that way must have no filled child covering it.
      for (const host of [active, active.parentElement]) {
        if (host && getComputedStyle(host).boxShadow.includes(AUDIT_RING)) {
          for (const child of host.children) {
            await expect(getComputedStyle(child).backgroundColor, `${name} child covers the ring`).toBe(
              'rgba(0, 0, 0, 0)',
            );
          }
        }
      }
      await expect(ringed, `${name} shows the Next ring`).toBe(true);
    }
    // A Toolbar is one tab stop (roving focus), so its three buttons count once.
    await expect(seen.size).toBeGreaterThanOrEqual(10);
  },
};
