//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, centreY, controlSize, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

const OPTIONS: Next.SelectOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
];

/**
 * A toolbar of every control kind; a non-looping toolbar with a drag handle, text and a link; a disabled toolbar; and
 * a toolbar with a Switch and a `gap` separator pushing its last button to the end.
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => (
  <>
    <Next.Toolbar.Root data-testid={`toolbar-${size}`}>
      <Next.Block>
        <Next.Icon icon='ph--circle--regular' />
      </Next.Block>
      <Next.Button icon='ph--plus--regular' label='Add' iconOnly data-testid={`add-${size}`} />
      <Next.Button icon='ph--minus--regular' label='Remove' iconOnly data-testid={`remove-${size}`} />
      <Next.Toolbar.Separator data-testid={`separator-${size}`} />
      <Next.Button data-testid={`button-${size}`}>Save</Next.Button>
      <Next.Input placeholder='Search' aria-label='Search' data-testid={`input-${size}`} />
      <Next.Select.Root items={OPTIONS}>
        <Next.Select.Trigger placeholder='Color' aria-label='Color' data-testid={`select-${size}`} />
        <Next.Select.Content>
          {OPTIONS.map((item) => (
            <Next.Select.Item key={item.value} item={item} />
          ))}
        </Next.Select.Content>
      </Next.Select.Root>
      <Next.Toolbar.ToggleGroup type='single' defaultValue='list' aria-label='View'>
        <Next.ToggleGroup.Item
          value='list'
          icon='ph--list--regular'
          label='List'
          iconOnly
          data-testid={`list-${size}`}
        />
        <Next.ToggleGroup.Item
          value='grid'
          icon='ph--squares-four--regular'
          label='Grid'
          iconOnly
          data-testid={`grid-${size}`}
        />
      </Next.Toolbar.ToggleGroup>
    </Next.Toolbar.Root>
    <Next.Toolbar.Root loop={false} data-testid={`document-${size}`}>
      <Next.DragHandle label='Drag' data-testid={`drag-${size}`} />
      <Next.Toolbar.Text data-testid={`text-${size}`}>
        A document title long enough to be truncated by the toolbar at every size
      </Next.Toolbar.Text>
      <Next.Toolbar.Link href='https://dxos.org' data-testid={`link-${size}`}>
        Docs
      </Next.Toolbar.Link>
      <Next.Button data-testid={`share-${size}`}>Share</Next.Button>
    </Next.Toolbar.Root>
    <Next.Toolbar.Root disabled data-testid={`disabled-${size}`}>
      <Next.Button icon='ph--plus--regular' label='Add disabled' iconOnly />
      <Next.Button>Save</Next.Button>
      <Next.Input aria-label='Disabled search' />
      <Next.Toolbar.Link href='https://dxos.org'>Docs</Next.Toolbar.Link>
    </Next.Toolbar.Root>
    <Next.Toolbar.Root data-testid={`settings-${size}`}>
      <Next.Button data-testid={`bold-${size}`}>Bold</Next.Button>
      <Next.Switch label='Wrap' data-testid={`wrap-${size}`} />
      <Next.Toolbar.Separator variant='gap' data-testid={`gap-${size}`} />
      <Next.Button data-testid={`done-${size}`}>Done</Next.Button>
    </Next.Toolbar.Root>
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Toolbar',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[40rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A search-style toolbar at every size: an input taking the remaining width, a text button and an icon button. */
export const InputAndButton: Story = {
  args: { allSizes: true },
  render: ({ size = 'md' }) => (
    <Next.Toolbar.Root data-testid={`input-toolbar-${size}`}>
      <Next.Input placeholder={`Search (${size})`} aria-label='Search' />
      <Next.Button>Go</Next.Button>
      <Next.Button icon='ph--magnifying-glass--regular' label='Search' iconOnly />
    </Next.Toolbar.Root>
  ),
};

/**
 * A toolbar is one block tall and every control in it is control-tall and centred (decision 12). The toolbar role comes
 * from the machine that implements its keyboard contract (decision 9): arrow keys, Home and End rove across its items,
 * and only one item is in the tab order. The visible space between any two adjacent items is three control insets: the
 * toolbar's gap plus each item's inline margin (an icon-only Button's inset cell, or the same margin on a Button, Input
 * or Select trigger); a Separator sits the same three insets from its neighbours and is skipped by the roving focus.
 * A `Toolbar.ToggleGroup`'s items join the toolbar's roving focus, so the group adds no tab stop. A DragHandle is a
 * ghost icon-only Button outside the roving focus; Text truncates in the free space; a Link is an item. With
 * `loop={false}` arrows stop at the ends; a `disabled` toolbar disables every control and has no tab stop. Items that
 * overflow scroll sideways in a thin horizontal ScrollArea (no native bar) whose viewport is the toolbar. A Switch's
 * input joins the roving focus, and a `gap` separator grows to push the items after it to the end.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const toolbar = byTestId(canvasElement, `toolbar-${size}`).getBoundingClientRect();
      await expect(toolbar.height, `toolbar-${size}`).toBeCloseTo(GEOMETRY[size].block, 0);
      for (const part of ['add', 'remove', 'button', 'input', 'select', 'list', 'grid']) {
        const rect = byTestId(canvasElement, `${part}-${size}`).getBoundingClientRect();
        await expect(rect.height, `${part}-${size} height`).toBeCloseTo(controlSize(size), 0);
        await expect(centreY(rect), `${part}-${size} centre`).toBeCloseTo(centreY(toolbar), 0);
      }
    }

    const canvas = within(canvasElement);
    const toolbars = canvas.getAllByRole('toolbar');
    await expect(toolbars).toHaveLength(4 * SIZES.length);
    for (const toolbar of toolbars) {
      await expect(toolbar).toHaveAttribute('aria-orientation', 'horizontal');
    }
    await expectScoped(canvasElement);

    // Overflowing items scroll sideways in a thin horizontal ScrollArea whose viewport is the toolbar itself.
    const scroller = byTestId(canvasElement, 'toolbar-md');
    const frame = scroller.parentElement;
    await expect(frame).toHaveClass('nx-scroll-root');
    await expect(frame).toHaveAttribute('data-orientation', 'horizontal');
    await expect(frame).toHaveAttribute('data-width', 'thin');
    await expect(scroller).toHaveClass('nx-scroll-viewport');
    await expect(getComputedStyle(scroller).overflowX).toBe('auto');
    await expect(getComputedStyle(scroller).overflowY).toBe('hidden');
    await expect(getComputedStyle(scroller).scrollbarWidth).toBe('none');

    // The separator is a control-tall vertical rule and no item: roving focus passes over it.
    const separator = byTestId(canvasElement, 'separator-md');
    await expect(separator).toHaveAttribute('role', 'separator');
    await expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    await expect(separator.getBoundingClientRect().height).toBeCloseTo(controlSize('md'), 0);
    await expect(separator).not.toHaveAttribute('tabindex');

    for (const size of ['md', 'lg'] as const) {
      const expected = 3 * GEOMETRY[size].inset;
      const items = ['add', 'remove', 'separator', 'button', 'input', 'select', 'list', 'grid'].map((part) =>
        byTestId(canvasElement, `${part}-${size}`).getBoundingClientRect(),
      );
      for (let index = 1; index < items.length; index++) {
        await expect(items[index].left - items[index - 1].right, `${size} gap ${index}`).toBeCloseTo(expected, 0);
      }
    }

    const add = byTestId(canvasElement, 'add-md');
    const remove = byTestId(canvasElement, 'remove-md');
    const save = byTestId(canvasElement, 'button-md');
    const select = byTestId(canvasElement, 'select-md');
    await waitFor(() => expect(add.tabIndex).toBe(0));
    await expect(remove.tabIndex).toBe(-1);

    add.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(remove).toHaveFocus();
    await expect(remove.tabIndex).toBe(0);
    await expect(add.tabIndex).toBe(-1);
    await userEvent.keyboard('{ArrowRight}');
    await expect(save).toHaveFocus();
    await userEvent.keyboard('{End}');
    const grid = byTestId(canvasElement, 'grid-md');
    await expect(grid).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(byTestId(canvasElement, 'list-md')).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(select).toHaveFocus();
    await userEvent.keyboard('{Home}');
    await expect(add).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(grid).toHaveFocus();

    // A toolbar ToggleGroup's items are toolbar items: one tab stop in all, and the group itself takes none.
    const view = within(sizeRow(canvasElement, 'md')).getByRole('radiogroup', { name: 'View' });
    await expect(view.tabIndex).toBe(-1);
    await expect(byTestId(canvasElement, 'list-md').tabIndex).toBe(-1);
    await userEvent.keyboard(' ');
    await waitFor(() => expect(grid).toHaveAttribute('aria-checked', 'true'));
    await expect(byTestId(canvasElement, 'list-md')).toHaveAttribute('aria-checked', 'false');

    // Drag handle, text, link and loop={false}.
    const drag = byTestId(canvasElement, 'drag-md');
    await expect(drag).toHaveAttribute('aria-label', 'Drag');
    await expect(drag).toHaveAttribute('data-variant', 'ghost');
    await expect(drag.tabIndex).toBe(-1);
    await expect(drag).not.toHaveAttribute('data-toolbar-item');
    const text = byTestId(canvasElement, 'text-md');
    await expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
    await expect(centreY(text.getBoundingClientRect())).toBeCloseTo(
      centreY(byTestId(canvasElement, 'document-md').getBoundingClientRect()),
      0,
    );
    const link = byTestId(canvasElement, 'link-md');
    const share = byTestId(canvasElement, 'share-md');
    await expect(link).toHaveAttribute('target', '_blank');
    await waitFor(() => expect(link.tabIndex).toBe(0));
    await expect(link.getBoundingClientRect().height).toBeCloseTo(controlSize('md'), 0);
    link.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(share).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(share).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(link).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(link).toHaveFocus();

    // Disabled.
    const disabled = byTestId(canvasElement, 'disabled-md');
    await expect(disabled).toHaveAttribute('aria-disabled', 'true');
    for (const control of disabled.querySelectorAll<HTMLElement>('button, input')) {
      await expect(control).toBeDisabled();
    }
    await expect(disabled.querySelector('a')).toHaveAttribute('aria-disabled', 'true');
    await expect(disabled.querySelectorAll('[tabindex="0"]')).toHaveLength(0);

    // Switch and gap.
    const settings = byTestId(canvasElement, 'settings-md');
    const done = byTestId(canvasElement, 'done-md');
    const doneStyle = getComputedStyle(done);
    await expect(settings.getBoundingClientRect().right - done.getBoundingClientRect().right).toBeCloseTo(
      parseFloat(doneStyle.marginRight),
      0,
    );
    await expect(byTestId(canvasElement, 'gap-md').getBoundingClientRect().width).toBeGreaterThan(100);
    await expect(within(settings).queryByRole('separator')).toBeNull();
    const wrap = within(settings).getByRole('switch', { name: 'Wrap' });
    await userEvent.click(byTestId(canvasElement, 'bold-md'));
    await userEvent.keyboard('{ArrowRight}');
    await expect(wrap).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(done).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(wrap).toHaveFocus();
    await expect(settings.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
  },
};

/** A toolbar that is also a landmark (an app bar) keeps the `role` it is given; arrows still move between its items. */
export const Banner: Story = {
  render: () => (
    <Next.Toolbar.Root role='banner'>
      <Next.Button label='Back' />
      <Next.Button label='Menu' />
    </Next.Toolbar.Root>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('banner')).toBeInTheDocument();
    const back = canvas.getByRole('button', { name: 'Back' });
    back.focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Menu' })).toHaveFocus());
  },
};

/** `inactive` dims the controls of a toolbar whose host is not in play, and leaves them operable. */
const InactiveStory = () => {
  const [count, setCount] = useState(0);
  return (
    <Next.Toolbar.Root inactive>
      <Next.Button label={`Pressed ${count}`} onClick={() => setCount((count) => count + 1)} />
    </Next.Toolbar.Root>
  );
};

export const Inactive: Story = {
  render: () => <InactiveStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Pressed 0' });
    await expect(button).toBeEnabled();
    await expect(Number(getComputedStyle(button).opacity)).toBeLessThan(1);
    await userEvent.click(button);
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Pressed 1' })).toBeInTheDocument());
  },
};
