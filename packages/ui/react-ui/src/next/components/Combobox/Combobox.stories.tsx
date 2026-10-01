//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import {
  GEOMETRY,
  byTestId,
  controlSize,
  expectAnchoredBelow,
  expectEndCell,
  expectPopupSize,
  expectScoped,
  expectScrollingPopup,
  popupFrame,
  sizeRow,
} from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

const OPTIONS: Next.ComboboxOption[] = [
  { value: 'alice', label: 'Alice Green', icon: 'ph--user--regular' },
  { value: 'bob', label: 'Bob Grey', icon: 'ph--user--regular' },
  { value: 'carol', label: 'Carol Black', icon: 'ph--user--regular' },
  { value: 'dan', label: 'Dan Brown', icon: 'ph--user--regular', disabled: true },
];

/** Enough options to overflow the popup's 20rem cap at every size. */
const LONG: Next.ComboboxOption[] = Array.from({ length: 30 }, (_, index) => ({
  value: `person-${index + 1}`,
  label: `Person ${index + 1}`,
}));

const DESCRIBED: Next.ComboboxOption[] = [
  { value: 'draft', label: 'Draft', description: 'Only you can see it', icon: 'ph--pencil-simple--regular' },
  { value: 'review', label: 'In review', description: 'Reviewers can comment', icon: 'ph--eye--regular' },
  { value: 'published', label: 'Published', description: 'Everyone in the space can read it' },
];

const startsWith: Next.ComboboxFilter = (option, query) => option.label.toLowerCase().startsWith(query.toLowerCase());

/** Items that arrive after mount, with a value already selected, as a lookup or query would deliver them. */
const AsyncCombobox = ({ size = 'md' }: SizeArgs) => {
  const [items, setItems] = useState<Next.ComboboxOption[]>([]);
  useEffect(() => {
    const timeout = setTimeout(() => setItems(OPTIONS), 100);
    return () => clearTimeout(timeout);
  }, []);
  return (
    <Next.Field.Root>
      <Next.Combobox.Root items={items} defaultValue={[OPTIONS[1].value]}>
        <Next.Combobox.Label>Lead</Next.Combobox.Label>
        <Next.Combobox.Control />
        <Next.Combobox.Content />
      </Next.Combobox.Root>
    </Next.Field.Root>
  );
};

/** A button trigger whose popup offers a create row while the query matches no label exactly. */
const CreatableCombobox = ({ size = 'md' }: SizeArgs) => {
  const [items, setItems] = useState<Next.ComboboxOption[]>(OPTIONS);
  const [value, setValue] = useState<string[]>([]);
  const [created, setCreated] = useState<string>();
  return (
    <Next.Field.Root>
      <Next.Combobox.Root
        items={items}
        value={value}
        onValueChange={({ value }) => setValue(value)}
        onCreate={(query) => {
          const option = { value: query.toLowerCase(), label: query };
          setItems((items) => [...items, option]);
          setValue([option.value]);
          setCreated(query);
        }}
      >
        <Next.Combobox.Label>Tag</Next.Combobox.Label>
        <Next.Combobox.Trigger placeholder='Pick or create' data-testid={`create-${size}`} />
        <Next.Combobox.Content data-testid={`create-popup-${size}`} />
      </Next.Combobox.Root>
      <Next.Typography data-testid={`created-${size}`}>
        {created ? `Created: ${created}` : 'Nothing created'}
      </Next.Typography>
    </Next.Field.Root>
  );
};

/** Results the caller loads for the query (no client-side filter), with a loading row meanwhile. */
const SearchCombobox = ({ size = 'md' }: SizeArgs) => {
  const [query, setQuery] = useState<string>();
  const [items, setItems] = useState<Next.ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (query === undefined) {
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      setItems(LONG.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())).slice(0, 5));
      setLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);
  return (
    <Next.Field.Root>
      <Next.Combobox.Root
        items={items}
        filter={null}
        loading={loading}
        onOpenChange={({ open }) => open && setQuery((query) => query ?? '')}
        onInputValueChange={({ inputValue, reason }) => reason === 'input-change' && setQuery(inputValue)}
      >
        <Next.Combobox.Label>Search</Next.Combobox.Label>
        <Next.Combobox.Trigger placeholder='Find a person' data-testid={`search-${size}`} />
        <Next.Combobox.Content data-testid={`search-popup-${size}`} />
      </Next.Combobox.Root>
    </Next.Field.Root>
  );
};

/** No trigger: opened under control and anchored to a text span (a virtual trigger), its search field composed in. */
const AnchoredCombobox = ({ size = 'md' }: SizeArgs) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string[]>([]);
  const anchor = useRef<HTMLSpanElement>(null);
  return (
    <>
      <Next.Group>
        <Next.Button onClick={() => setOpen(true)} data-testid={`open-anchored-${size}`}>
          Mention
        </Next.Button>
        <Next.Typography>
          Hello{' '}
          <span ref={anchor} data-testid={`anchor-${size}`}>
            @{OPTIONS.find((option) => option.value === value[0])?.label ?? '…'}
          </span>
        </Next.Typography>
      </Next.Group>
      <Next.Combobox.Root
        items={OPTIONS}
        open={open}
        onOpenChange={({ open }) => setOpen(open)}
        value={value}
        onValueChange={({ value }) => setValue(value)}
        positioning={{ getAnchorRect: () => anchor.current?.getBoundingClientRect() ?? null }}
      >
        <Next.Combobox.Content data-testid={`anchored-${size}`}>
          <Next.Combobox.Input aria-label='Mention' />
          <Next.Combobox.List />
        </Next.Combobox.Content>
      </Next.Combobox.Root>
    </>
  );
};

/**
 * The default substring filter with a clear trigger, a custom prefix `filter`, late-loading items in a Control that
 * renders its default Input and Trigger, and a long list that scrolls. Trigger mode: a button trigger with the input in
 * the popup (a plain picker, one with descriptions, one with a create row, one searching asynchronously) and a popup
 * anchored to a text span.
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => (
  <>
    <Next.Field.Root>
      <Next.Combobox.Root items={OPTIONS}>
        <Next.Combobox.Label>Owner</Next.Combobox.Label>
        <Next.Combobox.Control data-testid={`combobox-${size}`}>
          <Next.Combobox.Input placeholder='Search people' />
          <Next.Combobox.ClearTrigger aria-label='Clear owner' />
          <Next.Combobox.Trigger />
        </Next.Combobox.Control>
        <Next.Combobox.Content data-testid={`listbox-${size}`} />
      </Next.Combobox.Root>
    </Next.Field.Root>
    <Next.Input aria-label='Note' data-testid={`input-${size}`} />
    <Next.Field.Root>
      <Next.Combobox.Root items={OPTIONS} filter={startsWith}>
        <Next.Combobox.Label>Reviewer</Next.Combobox.Label>
        <Next.Combobox.Control>
          <Next.Combobox.Input placeholder='Starts with' />
          <Next.Combobox.Trigger />
        </Next.Combobox.Control>
        <Next.Combobox.Content size='lg' />
      </Next.Combobox.Root>
    </Next.Field.Root>
    <AsyncCombobox size={size} />
    <Next.Field.Root>
      <Next.Combobox.Root items={LONG}>
        <Next.Combobox.Label>Assignee</Next.Combobox.Label>
        <Next.Combobox.Control data-testid={`long-${size}`}>
          <Next.Combobox.Input placeholder='Many people' />
          <Next.Combobox.Trigger />
        </Next.Combobox.Control>
        <Next.Combobox.Content />
      </Next.Combobox.Root>
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Combobox.Root items={OPTIONS}>
        <Next.Combobox.Label>Owner (picker)</Next.Combobox.Label>
        <Next.Combobox.Trigger placeholder='Pick a person' data-testid={`picker-${size}`} />
        <Next.Combobox.Content data-testid={`picker-popup-${size}`} />
      </Next.Combobox.Root>
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Combobox.Root items={DESCRIBED} defaultValue={['review']}>
        <Next.Combobox.Label>Status</Next.Combobox.Label>
        <Next.Combobox.Trigger data-testid={`status-${size}`} />
        <Next.Combobox.Content data-testid={`status-popup-${size}`} />
      </Next.Combobox.Root>
    </Next.Field.Root>
    <CreatableCombobox size={size} />
    <SearchCombobox size={size} />
    <AnchoredCombobox size={size} />
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Combobox',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The control row is control-tall and as wide as an Input at every size, with its caret trigger a control square; a
 * ClearTrigger shows only while there is a value, and clears it. A
 * preselected value shows its label once late items load; typing then Enter selects the first match; a custom
 * `filter` replaces the default substring match. Typing filters the portalled listbox (case-insensitive substring) and
 * choosing fills the input; a long listbox scrolls in a thin ScrollArea with no native bar, keeping the highlight in
 * view. The listbox takes its control row's size unless given its own. Trigger mode: the button trigger is
 * control-sized, shows the placeholder then the choice, and opens a dialog whose search field takes focus and filters;
 * arrow keys and Enter select and Escape closes, both returning focus to the trigger. A description renders under its
 * text; the create row appears only without an exact match and calls `onCreate`; async results show a loading row,
 * then the caller's matches, then the empty state; a popup without a trigger anchors to `getAnchorRect`. The story
 * ends open.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const control = byTestId(canvasElement, `combobox-${size}`);
      const rect = control.getBoundingClientRect();
      await expect(rect.height, size).toBeCloseTo(controlSize(size), 0);
      await expect(rect.width, size).toBeCloseTo(
        byTestId(canvasElement, `input-${size}`).getBoundingClientRect().width,
        0,
      );
      await expect(parseFloat(getComputedStyle(control).marginTop), size).toBeCloseTo(GEOMETRY[size].inset, 0);
      const trigger = control.querySelector('[data-part="trigger"]')?.getBoundingClientRect();
      await expect(trigger?.width, size).toBeCloseTo(GEOMETRY[size].block, 0);
      await expect(trigger?.right, size).toBeCloseTo(rect.right, 0);
      await expectEndCell(control.querySelector('[data-part="trigger"] svg'), rect.right, size, `${size} caret`);
    }
    await expectScoped(canvasElement);

    const body = within(canvasElement.ownerDocument.body);
    const md = within(sizeRow(canvasElement, 'md'));
    await waitFor(() => expect(md.getByRole('combobox', { name: 'Lead' })).toHaveValue(OPTIONS[1].label));

    const first = within(sizeRow(canvasElement, 'xs')).getByRole('combobox', { name: 'Owner' });
    await userEvent.click(first);
    await userEvent.type(first, 'ali');
    // The listbox takes its control's row size (Phase 4 decision 2).
    await expectPopupSize(await body.findByRole('listbox'), 'xs');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(first).toHaveValue('Alice Green'));
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    const reviewer = md.getByRole('combobox', { name: 'Reviewer' });
    await userEvent.type(reviewer, 'c');
    const prefixed = await body.findByRole('listbox');
    // An explicit size wins over the inherited one.
    await expectPopupSize(prefixed, 'lg');
    await waitFor(() => expect(within(prefixed).getAllByRole('option')).toHaveLength(1));
    await expect(within(prefixed).getByRole('option', { name: 'Carol Black' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    // A long listbox scrolls in a thin ScrollArea, and the keyboard highlight stays in view.
    const assignee = md.getByRole('combobox', { name: 'Assignee' });
    await userEvent.click(within(byTestId(canvasElement, 'long-md')).getByRole('button'));
    const longList = await body.findByRole('listbox');
    await waitFor(() => expect(assignee).toHaveFocus());
    await expect(popupFrame(longList)).toHaveAttribute('data-width', 'thin');
    await expectScrollingPopup(longList, 20);
    // The arrow keys stop at either end rather than wrapping.
    const highlighted = () => longList.querySelector('[data-highlighted]')?.textContent;
    const options = within(longList).getAllByRole('option');
    await userEvent.keyboard('{End}{ArrowDown}');
    await waitFor(() => expect(highlighted()).toBe(options[options.length - 1].textContent));
    await userEvent.keyboard('{Home}{ArrowUp}');
    await waitFor(() => expect(highlighted()).toBe(options[0].textContent));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    // Trigger mode: at every size the button trigger is control-tall and as wide as an Input.
    for (const size of SIZES) {
      const picker = byTestId(canvasElement, `picker-${size}`).getBoundingClientRect();
      await expect(picker.height, size).toBeCloseTo(controlSize(size), 0);
      await expect(picker.width, size).toBeCloseTo(
        byTestId(canvasElement, `input-${size}`).getBoundingClientRect().width,
        0,
      );
    }

    // The trigger shows the placeholder, opens a dialog below it whose search field takes focus, and typing filters.
    const picker = byTestId(canvasElement, 'picker-md');
    await expect(picker).toHaveTextContent('Pick a person');
    await expect(picker).toHaveAttribute('aria-haspopup', 'dialog');
    // Room below, so the popup is not flipped above the trigger.
    picker.scrollIntoView({ block: 'start' });
    await userEvent.click(picker);
    const pickerPopup = await body.findByTestId('picker-popup-md');
    await expectAnchoredBelow(picker, pickerPopup);
    await expectPopupSize(pickerPopup, 'md');
    await expect(pickerPopup).toHaveAttribute('role', 'dialog');
    const pickerSearch = within(pickerPopup).getByRole('combobox');
    await waitFor(() => expect(pickerSearch).toHaveFocus());
    await expect(within(pickerPopup).getByRole('listbox')).toBeVisible();
    await expect(within(pickerPopup).getAllByRole('option')).toHaveLength(OPTIONS.length);
    await userEvent.keyboard('gr');
    await waitFor(() => expect(within(pickerPopup).getAllByRole('option')).toHaveLength(2));
    // Arrow keys and Enter select, close, and return focus to the trigger, which shows the choice.
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(body.queryByTestId('picker-popup-md')).toBeNull());
    await expect(picker).toHaveTextContent('Bob Grey');
    await waitFor(() => expect(picker).toHaveFocus());
    // Reopened from the keyboard, the search starts empty on every option; Escape closes and returns focus.
    await userEvent.keyboard('{Enter}');
    const reopenedPicker = await body.findByTestId('picker-popup-md');
    await waitFor(() => expect(within(reopenedPicker).getByRole('combobox')).toHaveFocus());
    await expect(within(reopenedPicker).getByRole('combobox')).toHaveValue('');
    await expect(within(reopenedPicker).getAllByRole('option')).toHaveLength(OPTIONS.length);
    await expect(within(reopenedPicker).getByRole('option', { name: 'Bob Grey' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByTestId('picker-popup-md')).toBeNull());
    await waitFor(() => expect(picker).toHaveFocus());

    // An option's description renders under its text, growing the row by a line.
    const status = byTestId(canvasElement, 'status-md');
    await expect(status).toHaveTextContent('In review');
    // The value button sets its option icon a full gap from the label, as a Button does.
    const statusIcon = status.querySelector('svg')?.getBoundingClientRect();
    const statusText = status.querySelector('[data-part="value-text"]')?.getBoundingClientRect();
    const statusGap = parseFloat(getComputedStyle(status).columnGap);
    await expect(statusGap).toBeGreaterThan(GEOMETRY.md.inset);
    await expect((statusText?.left ?? 0) - (statusIcon?.right ?? 0)).toBeCloseTo(statusGap, 0);
    await userEvent.click(status);
    const statusPopup = await body.findByTestId('status-popup-md');
    const review = within(statusPopup).getByRole('option', { name: /In review/ });
    const reviewText = review.querySelector<HTMLElement>('[data-part="item-text"]');
    const reviewDescription = review.querySelector<HTMLElement>('[data-part="item-description"]');
    await expect(reviewDescription).toHaveTextContent('Reviewers can comment');
    await waitFor(async () => {
      const textRect = reviewText?.getBoundingClientRect() ?? new DOMRect();
      const descriptionRect = reviewDescription?.getBoundingClientRect() ?? new DOMRect();
      await expect(descriptionRect.top).toBeGreaterThanOrEqual(textRect.bottom - 0.5);
      await expect(descriptionRect.left).toBeCloseTo(textRect.left, 0);
      await expect(review.getBoundingClientRect().height).toBeGreaterThan(GEOMETRY.md.block);
    });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByTestId('status-popup-md')).toBeNull());

    // The create row appears only without an exact match, last, and choosing it calls `onCreate` with the query.
    const creatable = byTestId(canvasElement, 'create-md');
    await userEvent.click(creatable);
    const createPopup = await body.findByTestId('create-popup-md');
    await waitFor(() => expect(within(createPopup).getByRole('combobox')).toHaveFocus());
    await userEvent.keyboard('Alice Green');
    await waitFor(() => expect(within(createPopup).getAllByRole('option')).toHaveLength(1));
    await expect(within(createPopup).queryByRole('option', { name: /Create/ })).toBeNull();
    await userEvent.clear(within(createPopup).getByRole('combobox'));
    await userEvent.keyboard('Al');
    await waitFor(() => expect(within(createPopup).getAllByRole('option')).toHaveLength(2));
    await expect(within(createPopup).getAllByRole('option')[1]).toHaveAccessibleName('Create “Al”');
    await userEvent.keyboard('{Backspace}{Backspace}Zed');
    await waitFor(() => expect(within(createPopup).getAllByRole('option')).toHaveLength(1));
    await expect(within(createPopup).getByRole('option')).toHaveAccessibleName('Create “Zed”');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(body.queryByTestId('create-popup-md')).toBeNull());
    await expect(byTestId(canvasElement, 'created-md')).toHaveTextContent('Created: Zed');
    await waitFor(() => expect(creatable).toHaveTextContent('Zed'));
    await waitFor(() => expect(creatable).toHaveFocus());

    // Async results: a loading row (and no empty state) until they arrive, then the caller's matches unfiltered, and
    // the empty state when none match.
    const searchTrigger = byTestId(canvasElement, 'search-md');
    await userEvent.click(searchTrigger);
    const searchPopup = await body.findByTestId('search-popup-md');
    await expect(searchPopup).toHaveAttribute('aria-busy', 'true');
    await expect(searchPopup).toHaveTextContent('Loading…');
    await expect(searchPopup).not.toHaveTextContent('No results');
    await waitFor(() => expect(within(searchPopup).getAllByRole('option')).toHaveLength(5));
    await expect(searchPopup).not.toHaveAttribute('aria-busy');
    await expect(searchPopup).not.toHaveTextContent('Loading…');
    await userEvent.keyboard('12');
    await waitFor(() => expect(searchPopup).toHaveAttribute('aria-busy', 'true'));
    await waitFor(() => expect(within(searchPopup).getAllByRole('option')).toHaveLength(1));
    await expect(within(searchPopup).getByRole('option')).toHaveAccessibleName('Person 12');
    await userEvent.keyboard('zz');
    await waitFor(() => expect(searchPopup).toHaveTextContent('No results'));
    await expect(within(searchPopup).queryAllByRole('option')).toHaveLength(0);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByTestId('search-popup-md')).toBeNull());

    // A virtual trigger: opened under control and anchored to another element's rect, falling back to `md`.
    byTestId(canvasElement, 'anchor-md').scrollIntoView({ block: 'start' });
    await userEvent.click(byTestId(canvasElement, 'open-anchored-md'));
    const anchored = await body.findByTestId('anchored-md');
    await expectAnchoredBelow(byTestId(canvasElement, 'anchor-md'), anchored);
    await expectPopupSize(anchored, 'md');
    // Wider than its few-pixel anchor: every option's label fits, unclipped.
    await expect(anchored.getBoundingClientRect().width).toBeGreaterThan(
      byTestId(canvasElement, 'anchor-md').getBoundingClientRect().width,
    );
    for (const option of within(anchored).getAllByRole('option')) {
      const text = option.querySelector<HTMLElement>('[data-part="item-text"]') ?? option;
      await expect(text.scrollWidth, option.textContent ?? '').toBeLessThanOrEqual(text.clientWidth + 1);
    }
    const mention = within(anchored).getByRole('combobox', { name: 'Mention' });
    await waitFor(() => expect(mention).toHaveFocus());
    await userEvent.keyboard('car{Enter}');
    await waitFor(() => expect(body.queryByTestId('anchored-md')).toBeNull());
    await expect(byTestId(canvasElement, 'anchor-md')).toHaveTextContent('@Carol Black');

    const input = md.getByRole('combobox', { name: 'Owner' });

    await userEvent.click(within(byTestId(canvasElement, 'combobox-md')).getByRole('button'));
    const listbox = await body.findByRole('listbox');
    await expect(listbox).toBe(body.getByTestId('listbox-md'));
    await expectAnchoredBelow(byTestId(canvasElement, 'combobox-md'), listbox);
    // The ScrollArea frame is the surface; the listbox itself is its viewport.
    await expect(popupFrame(listbox)).toHaveAttribute('data-surface', 'popup');
    await expect(listbox).toHaveAttribute('data-scope', 'combobox');
    await expect(within(listbox).getAllByRole('option')).toHaveLength(OPTIONS.length);
    await expect(within(listbox).getByRole('option', { name: 'Dan Brown' })).toHaveAttribute('data-disabled');

    await userEvent.type(input, 'gr');
    await waitFor(() => expect(within(listbox).getAllByRole('option')).toHaveLength(2));
    await userEvent.click(within(listbox).getByRole('option', { name: 'Bob Grey' }));
    await waitFor(() => expect(input).toHaveValue('Bob Grey'));
    await waitFor(() => expect(body.queryByRole('listbox')).toBeNull());

    // The clear trigger appears with a value and clears it.
    const clear = byTestId(canvasElement, 'combobox-md').querySelector<HTMLElement>('[data-part="clear-trigger"]');
    await expect(clear).toBeVisible();
    if (clear) {
      await userEvent.click(clear);
    }
    await waitFor(() => expect(input).toHaveValue(''));
    await waitFor(() => expect(clear).not.toBeVisible());

    // Reopening lists every option again, and a query with no match shows the empty state.
    await userEvent.clear(input);
    await userEvent.type(input, 'zz');
    const reopened = await body.findByRole('listbox');
    await waitFor(() => expect(within(reopened).queryAllByRole('option')).toHaveLength(0));
    await expect(reopened).toHaveTextContent('No results');
    await userEvent.clear(input);
    await userEvent.type(input, 'a');
    await waitFor(() => expect(within(body.getByRole('listbox')).getAllByRole('option').length).toBeGreaterThan(1));
  },
};
