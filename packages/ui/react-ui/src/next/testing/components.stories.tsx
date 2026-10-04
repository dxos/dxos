//
// Copyright 2026 DXOS.org
//

import '../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent } from 'storybook/test';

import { withTheme } from '../../testing/index.ts';
import { Block } from '../components/Block/Block.tsx';
import { Button } from '../components/Button/Button.tsx';
import { Checkbox } from '../components/Checkbox/Checkbox.tsx';
import * as Collapsible from '../components/Collapsible/Collapsible.tsx';
import * as Combobox from '../components/Combobox/Combobox.tsx';
import { Container } from '../components/Container/Container.tsx';
import * as Field from '../components/Field/Field.tsx';
import * as Icon from '../components/Icon/Icon.tsx';
import { Input } from '../components/Input/Input.tsx';
import { Label } from '../components/Label/Label.tsx';
import * as Select from '../components/Select/Select.tsx';
import { Switch } from '../components/Switch/Switch.tsx';
import { Textarea } from '../components/Textarea/Textarea.tsx';
import { Toggle } from '../components/Toggle/Toggle.tsx';
import * as Toolbar from '../components/Toolbar/Toolbar.tsx';
import * as Typography from '../components/Typography/Typography.tsx';
import * as UiInput from '../namespaces/Input.ts';
import { type Size, SIZES } from '../sizes.ts';
import { SIZE_ARG_TYPES, type SizeArgs } from './stories.tsx';

const LABEL_COLUMNS = 'auto [field-start] minmax(0, 1fr)';

const OPTIONS: Select.Option[] = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
];

const SizeSection = ({ size }: { size: Size }) => (
  <Container size={size} gutter='rail' columns={LABEL_COLUMNS} data-testid={`section-${size}`}>
    <Toolbar.Root data-testid={`toolbar-${size}`}>
      <Block>
        <Icon.Icon icon='ph--circle--regular' />
      </Block>
      <Button icon='ph--plus--regular' label='Add' iconOnly data-testid={`add-${size}`} />
      <Button icon='ph--minus--regular' label='Remove' iconOnly data-testid={`remove-${size}`} />
      <Button data-testid={`button-${size}`}>Save</Button>
      <Input placeholder='Search' aria-label='Search' data-testid={`input-${size}`} />
      <Select.Root items={OPTIONS}>
        <Select.Trigger placeholder='Color' aria-label='Color' data-testid={`select-${size}`} />
        <Select.Content data-testid={`listbox-${size}`}>
          {OPTIONS.map((item) => (
            <Select.Item key={item.value} item={item} />
          ))}
        </Select.Content>
      </Select.Root>
    </Toolbar.Root>

    <Container layout='row' data-testid={`row-${size}`}>
      <Block rail='start' data-testid={`row-${size}-rail-start`}>
        <Icon.Icon icon='ph--user--regular' />
      </Block>
      <Label htmlFor={`name-${size}`} classNames='pe-(--dx-gap-size)'>
        Name
      </Label>
      <Input id={`name-${size}`} data-testid={`row-input-${size}`} />
      <Block rail='end'>
        <Icon.Icon icon='ph--x--regular' label='Clear' />
      </Block>
    </Container>

    <Container>
      <Checkbox label='Subscribe' defaultChecked data-testid={`checkbox-${size}`} />
    </Container>

    <Field.Root data-testid={`field-${size}`}>
      <Field.Label>Email</Field.Label>
      <Input data-testid={`field-input-${size}`} />
      <Field.HelperText>We never share it.</Field.HelperText>
    </Field.Root>

    <Field.Root invalid>
      <Field.Label>Website</Field.Label>
      <Input defaultValue='not a url' />
      <Field.ErrorText>Enter a valid URL.</Field.ErrorText>
    </Field.Root>

    <Container>
      <Block rail='start'>
        <Icon.Icon icon='ph--chat-circle--regular' />
      </Block>
      <Typography.Text>
        Typography centres its first line in the block, so the icon beside it lines up however far it wraps.
      </Typography.Text>
    </Container>
  </Container>
);

/** Every size by default; pick one in the properties panel by turning `allSizes` off. */
const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (
  <div className='dx-scope @container flex flex-col gap-4 w-[40rem]' data-size='md'>
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
  <div className='dx-scope' data-size='md' style={{ ['--dx-focus-ring-color' as string]: AUDIT_RING }}>
    <Container gutter='rail' level='base'>
      <Field.Root>
        <Field.Label>Input</Field.Label>
        <Input />
      </Field.Root>
      <Field.Root>
        <Field.Label>Textarea</Field.Label>
        <Textarea />
      </Field.Root>
      <Field.Root>
        <Field.Label>Date</Field.Label>
        <UiInput.Date defaultValue='2026-09-29' />
      </Field.Root>
      <Field.Root>
        <Field.Label>Time</Field.Label>
        <UiInput.Date type='time' defaultValue='09:30' />
      </Field.Root>
      <Field.Root>
        <Select.Root items={OPTIONS}>
          <Select.Label>Select</Select.Label>
          <Select.Trigger placeholder='Pick one' />
          <Select.Content size='md'>
            {OPTIONS.map((item) => (
              <Select.Item key={item.value} item={item} />
            ))}
          </Select.Content>
        </Select.Root>
      </Field.Root>
      <Field.Root>
        <Combobox.Root items={OPTIONS}>
          <Combobox.Label>Combobox</Combobox.Label>
          <Combobox.Control>
            <Combobox.Input placeholder='Search' />
            <Combobox.Trigger />
          </Combobox.Control>
          <Combobox.Content size='md' />
        </Combobox.Root>
      </Field.Root>
      <Checkbox label='Checkbox' />
      <Switch label='Switch' />
      <Collapsible.Root>
        <Collapsible.Trigger>Collapsible</Collapsible.Trigger>
        <Collapsible.Content>
          <Typography.Text>Hidden content.</Typography.Text>
        </Collapsible.Content>
      </Collapsible.Root>
      <Toolbar.Root>
        <Button>Button</Button>
        <Button icon='ph--plus--regular' label='Add' iconOnly showTooltip={false} />
        <Toggle icon='ph--text-b--regular' label='Bold' iconOnly showTooltip={false} />
      </Toolbar.Root>
    </Container>
  </div>
);

/** Colours a focused part, its immediate relatives and the control row hosting it (DateInput's segments) paint for focus. */
const focusPaint = (element: Element) =>
  [element, element.parentElement, ...(element.parentElement?.children ?? []), element.closest('.dx-control')]
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
