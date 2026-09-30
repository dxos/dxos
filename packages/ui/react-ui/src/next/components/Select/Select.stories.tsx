//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { Fragment } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import {
  GEOMETRY,
  byTestId,
  centreY,
  controlSize,
  expectAnchoredBelow,
  expectPopupSize,
  expectScoped,
  expectScrollingPopup,
  popupFrame,
  sizeRow,
  watchResizeObserverLoop,
} from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

const OPTIONS: Next.SelectOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'black', label: 'Black', disabled: true },
];

const ICON_OPTIONS: Next.SelectOption[] = [
  { value: 'list', label: 'List', icon: 'ph--list--regular' },
  { value: 'grid', label: 'Grid', icon: 'ph--squares-four--regular' },
  { value: 'table', label: 'Table', icon: 'ph--table--regular' },
];

/** Labels of very different widths, for the `fit='options'` trigger. */
const DENSITY: Next.SelectOption[] = [
  { value: 'xs', label: 'XS' },
  { value: 'comfortable', label: 'Comfortable spacing' },
  { value: 'md', label: 'Medium' },
];

/** Enough options to overflow the popup's 20rem cap at every size. */
const LONG: Next.SelectOption[] = Array.from({ length: 30 }, (_, index) => ({
  value: `option-${index + 1}`,
  label: `Option ${index + 1}`,
}));

const FRUIT: Next.SelectOption[] = [
  { value: 'apple', label: 'Apple', icon: 'ph--circle--fill', iconHue: 'red' },
  { value: 'pear', label: 'Pear', icon: 'ph--circle--fill', iconHue: 'lime' },
];

const VEGETABLES: Next.SelectOption[] = [
  { value: 'kale', label: 'Kale', icon: 'ph--circle--fill', iconHue: 'emerald' },
  { value: 'leek', label: 'Leek' },
];

/**
 * A plain select, one whose options have leading icons, then a grouped select with hued icons and custom item content,
 * a `multiple` select and a loading one, then a `fit='options'` trigger as wide as its widest option; `Select.Content` inherits its trigger row's size, except the grouped one, `lg` at every size.
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => (
  <>
    <Next.Toolbar.Root data-testid={`toolbar-${size}`}>
      <Next.Select.Root items={OPTIONS}>
        <Next.Select.Trigger placeholder='Color' aria-label='Color' data-testid={`select-${size}`} />
        <Next.Select.Content data-testid={`listbox-${size}`}>
          {OPTIONS.map((item) => (
            <Fragment key={item.value}>
              {item.disabled && <Next.Select.Separator />}
              <Next.Select.Item item={item} />
            </Fragment>
          ))}
        </Next.Select.Content>
      </Next.Select.Root>
      <Next.Select.Root items={ICON_OPTIONS}>
        <Next.Select.Trigger placeholder='View' aria-label='View' />
        <Next.Select.Content>
          {ICON_OPTIONS.map((item) => (
            <Next.Select.Item key={item.value} item={item} />
          ))}
        </Next.Select.Content>
      </Next.Select.Root>
    </Next.Toolbar.Root>
    <Next.Toolbar.Root>
      <Next.Select.Root items={[...FRUIT, ...VEGETABLES]}>
        <Next.Select.Trigger placeholder='Produce' aria-label='Produce' />
        <Next.Select.Content size='lg'>
          {[
            { label: 'Fruit', items: FRUIT },
            { label: 'Vegetables', items: VEGETABLES },
          ].map(({ label, items }) => (
            <Next.Select.ItemGroup key={label}>
              <Next.Select.ItemGroupLabel>{label}</Next.Select.ItemGroupLabel>
              {items.map((item) =>
                item.value === 'leek' ? (
                  <Next.Select.Item key={item.value} item={item}>
                    <Next.Select.ItemIcon icon='ph--circle--fill' hue='amber' />
                    <Next.Select.ItemText>
                      <Next.Tag hue='amber'>Leek</Next.Tag>
                    </Next.Select.ItemText>
                    <Next.Select.ItemIndicator />
                  </Next.Select.Item>
                ) : (
                  <Next.Select.Item key={item.value} item={item} />
                ),
              )}
            </Next.Select.ItemGroup>
          ))}
        </Next.Select.Content>
      </Next.Select.Root>
      <Next.Select.Root items={OPTIONS} multiple>
        <Next.Select.Trigger placeholder='Colors' aria-label='Colors' />
        <Next.Select.Content>
          {OPTIONS.map((item) => (
            <Next.Select.Item key={item.value} item={item} />
          ))}
        </Next.Select.Content>
      </Next.Select.Root>
      <Next.Select.Root items={LONG}>
        <Next.Select.Trigger placeholder='Long' aria-label='Long' />
        <Next.Select.Content>
          {LONG.map((item) => (
            <Next.Select.Item key={item.value} item={item} />
          ))}
        </Next.Select.Content>
      </Next.Select.Root>
      <Next.Select.Root items={[]}>
        <Next.Select.Trigger placeholder='Loading' aria-label='Lookup' loading />
        <Next.Select.Content />
      </Next.Select.Root>
    </Next.Toolbar.Root>
    <Next.Toolbar.Root>
      <Next.Select.Root items={DENSITY}>
        <Next.Select.Trigger fit='options' placeholder='Density' aria-label='Density' data-testid={`fit-${size}`} />
        <Next.Select.Content>
          {DENSITY.map((item) => (
            <Next.Select.Item key={item.value} item={item} />
          ))}
        </Next.Select.Content>
      </Next.Select.Root>
    </Next.Toolbar.Root>
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Select',
  render: DefaultStory,
  decorators: [withSizes({ width: 'w-[24rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Triggers are control-tall and centred in their block at every size (decision 12). Clicking the trigger opens a
 * portalled listbox at `level='popup'`; choosing an option closes it and shows the choice, and Escape closes it without
 * choosing; a decorative Separator spans the popup between options. Grouped options sit in labelled `group`s, a
 * `hue` colours an option's icon, and an Item's children replace its whole row, composed from parts. A `multiple` select stays open
 * while choosing and lists every choice; a long listbox scrolls in a thin ScrollArea with no native bar, keeping the
 * highlight in view; a `loading` trigger is busy and spins in place of its caret. A popup is at least its trigger's
 * width and grows to fit its widest option; a `fit='options'` trigger keeps the widest option's width whatever is
 * chosen. A listbox takes its trigger row's size unless given its own. Option icons lead each item and, once chosen, the trigger's value, at the size's icon scale. The story
 * ends with the icon listbox open.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const toolbar = byTestId(canvasElement, `toolbar-${size}`).getBoundingClientRect();
      const rect = byTestId(canvasElement, `select-${size}`).getBoundingClientRect();
      await expect(rect.height, `select-${size} height`).toBeCloseTo(controlSize(size), 0);
      await expect(centreY(rect), `select-${size} centre`).toBeCloseTo(centreY(toolbar), 0);
    }
    await expectScoped(canvasElement);

    const canvas = within(sizeRow(canvasElement, 'md'));
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('combobox', { name: 'Color' });
    await userEvent.click(trigger);
    const listbox = await body.findByRole('listbox');
    await expect(listbox).toBe(body.getByTestId('listbox-md'));
    await expectAnchoredBelow(trigger, listbox);
    // The ScrollArea frame is the surface; the listbox itself is its viewport.
    const frame = popupFrame(listbox);
    await expect(frame.dataset.surface).toBe('popup');
    await expect(frame.dataset.size).toBe('md');
    await expect(getComputedStyle(frame).getPropertyValue('--nx-level').trim()).toBe('5');
    await expect(listbox.dataset.scope).toBe('select');
    await expect(within(listbox).getAllByRole('option')).toHaveLength(OPTIONS.length);
    await expect(within(listbox).getByRole('option', { name: 'Black' })).toHaveAttribute('data-disabled');
    // The separator is decorative: a listbox owns only options and groups.
    const separator = listbox.querySelector<HTMLElement>('[data-scope="separator"]');
    await expect(separator).toHaveAttribute('aria-hidden', 'true');
    await expect(within(listbox).queryByRole('separator')).toBeNull();
    await expect(separator?.getBoundingClientRect().width).toBeCloseTo(listbox.clientWidth, 0);

    await userEvent.click(within(listbox).getByRole('option', { name: 'Green' }));
    await waitFor(() => expect(trigger).toHaveTextContent('Green'));
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    await userEvent.click(trigger);
    // Escape reaches the popup only once zag has moved focus into it.
    const reopened = await body.findByRole('listbox');
    await waitFor(() => expect(reopened).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());
    await expect(trigger).toHaveTextContent('Green');

    // The listbox takes its trigger's row size (Phase 4 decision 2).
    const smTrigger = within(sizeRow(canvasElement, 'sm')).getByRole('combobox', { name: 'Color' });
    await userEvent.click(smTrigger);
    const smList = await body.findByRole('listbox');
    await expectPopupSize(smList, 'sm');
    await expect(within(smList).getAllByRole('option')[0].getBoundingClientRect().height).toBeCloseTo(
      GEOMETRY.sm.block,
      0,
    );
    await waitFor(() => expect(smList).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    const view = canvas.getByRole('combobox', { name: 'View' });
    await expect(view.querySelectorAll('.nx-icon')).toHaveLength(1);
    await userEvent.click(view);
    await userEvent.click(await body.findByRole('option', { name: 'Grid' }));
    await waitFor(() => expect(view).toHaveTextContent('Grid'));
    const icons = view.querySelectorAll<SVGElement>('.nx-icon');
    await expect(icons).toHaveLength(2);
    await expect(icons[0].getAttribute('aria-hidden')).toBe('true');
    await expect(icons[0].getBoundingClientRect().left).toBeLessThan(
      within(view).getByText('Grid').getBoundingClientRect().left,
    );
    await expect(icons[0].getBoundingClientRect().width).toBeCloseTo(16, 0);

    // Groups, hued icons and custom item content.
    const produce = canvas.getByRole('combobox', { name: 'Produce' });
    await userEvent.click(produce);
    const produceList = await body.findByRole('listbox');
    // An explicit size wins over the inherited one.
    await expectPopupSize(produceList, 'lg');
    await expect(within(produceList).getByRole('group', { name: 'Fruit' })).toBeInTheDocument();
    const vegetables = within(produceList).getByRole('group', { name: 'Vegetables' });
    await expect(within(vegetables).getAllByRole('option')).toHaveLength(2);
    const apple = within(produceList).getByRole('option', { name: 'Apple' }).querySelector('svg');
    const pear = within(produceList).getByRole('option', { name: 'Pear' }).querySelector('svg');
    await expect(apple && getComputedStyle(apple).color).not.toBe(pear && getComputedStyle(pear).color);
    // Kale's default row renders its data (icon, text, indicator); Leek's children compose the same parts around a Tag.
    const kale = within(vegetables).getByRole('option', { name: 'Kale' });
    await expect(kale.querySelector('[data-part="item-text"]')).toHaveTextContent('Kale');
    await expect(kale.querySelector('[data-part="item-indicator"]')).not.toBeNull();
    await expect(kale.querySelectorAll('.nx-icon')).toHaveLength(2);
    const leek = within(vegetables).getByRole('option', { name: 'Leek' });
    await expect(leek.querySelector('[data-part="item-text"] [data-scope="tag"]')).not.toBeNull();
    await expect(leek.querySelector('[data-part="item-indicator"]')).not.toBeNull();
    await expect(leek.querySelector('.nx-icon')?.getBoundingClientRect().left).toBeCloseTo(
      kale.querySelector('.nx-icon')?.getBoundingClientRect().left ?? 0,
      0,
    );
    await userEvent.click(leek);
    await waitFor(() => expect(produce).toHaveTextContent('Leek'));
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    // Multiple: the popup stays open and the trigger lists the choices; the trigger widening under the open popup
    // must not loop the ScrollArea thumbs' ResizeObserver.
    const checkResizeLoop = watchResizeObserverLoop(canvasElement);
    const colors = canvas.getByRole('combobox', { name: 'Colors' });
    await userEvent.click(colors);
    const colorList = await body.findByRole('listbox');
    await expect(colorList).toHaveAttribute('aria-multiselectable', 'true');
    await userEvent.click(within(colorList).getByRole('option', { name: 'Red' }));
    await userEvent.click(within(colorList).getByRole('option', { name: 'Blue' }));
    await expect(body.getByRole('listbox')).toBe(colorList);
    await waitFor(() => expect(colors).toHaveTextContent('Red, Blue'));
    // The deferred reposition still lets the popup follow its widened trigger.
    await waitFor(() =>
      expect(popupFrame(colorList).getBoundingClientRect().width).toBeGreaterThanOrEqual(
        Math.round(colors.getBoundingClientRect().width) - 1,
      ),
    );
    await expect(within(colorList).getByRole('option', { name: 'Red' })).toHaveAttribute('aria-selected', 'true');
    await checkResizeLoop();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    // A long listbox scrolls in a thin ScrollArea, and the keyboard highlight stays in view.
    await userEvent.click(canvas.getByRole('combobox', { name: 'Long' }));
    const longList = await body.findByRole('listbox');
    await waitFor(() => expect(longList).toHaveFocus());
    await expect(popupFrame(longList)).toHaveAttribute('data-width', 'thin');
    await expectScrollingPopup(longList, 20);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    // Loading.
    const lookup = canvas.getByRole('combobox', { name: 'Lookup' });
    await expect(lookup).toHaveAttribute('aria-busy', 'true');
    const spinner = lookup.querySelector<SVGElement>('[data-spin]');
    await expect(spinner && getComputedStyle(spinner).animationName).toBe('nx-spin');

    // `fit='options'`: as wide as the widest option, whichever is chosen.
    for (const size of SIZES) {
      const fit = byTestId(canvasElement, `fit-${size}`);
      const width = fit.getBoundingClientRect().width;
      const value = fit.querySelector<HTMLElement>('[data-part="value-text"]');
      const widest = Math.max(
        ...Array.from(fit.querySelectorAll<HTMLElement>('[data-part="value-sizer"] > *')).map(
          (label) => label.scrollWidth,
        ),
      );
      await expect(value?.getBoundingClientRect().width ?? 0, `fit-${size} value`).toBeGreaterThanOrEqual(widest - 0.5);
      if (size === 'md') {
        for (const { label } of DENSITY) {
          await userEvent.click(fit);
          await userEvent.click(await body.findByRole('option', { name: label }));
          await waitFor(() => expect(value).toHaveTextContent(label));
          await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());
          await expect(fit.getBoundingClientRect().width, `fit-md with ${label}`).toBeCloseTo(width, 0);
        }
      }
    }

    // The popup is at least the trigger's width and fits its widest option unclipped.
    await userEvent.click(view);
    const views = await body.findByRole('listbox');
    await expect(popupFrame(views).getBoundingClientRect().width).toBeGreaterThanOrEqual(
      view.getBoundingClientRect().width - 0.5,
    );
    for (const text of views.querySelectorAll<HTMLElement>('[data-part="item-text"]')) {
      await expect(text.scrollWidth, `${text.textContent} unclipped`).toBeLessThanOrEqual(text.clientWidth);
    }
    for (const option of within(views).getAllByRole('option')) {
      const icon = option.querySelector<SVGElement>('.nx-icon');
      await expect(icon?.getBoundingClientRect().width).toBeCloseTo(16, 0);
      await expect(icon?.getBoundingClientRect().left).toBeLessThan(option.getBoundingClientRect().left + 16);
    }
    await expectScoped(canvasElement);
  },
};
