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
import { GEOMETRY, byTestId, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

const PEOPLE: Next.ListboxOption[] = [
  { value: 'alice', label: 'Alice Green', icon: 'ph--user--regular' },
  { value: 'bob', label: 'Bob Grey', icon: 'ph--user--regular', description: 'Away until Monday' },
  { value: 'carol', label: 'Carol Black', icon: 'ph--user--regular' },
  { value: 'dan', label: 'Dan Brown', icon: 'ph--user--regular', disabled: true },
  { value: 'erin', label: 'Erin White', icon: 'ph--user--regular' },
];

const TAGS: Next.ListboxOption[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'later', label: 'Later' },
  { value: 'idea', label: 'Idea' },
];

const LONG: Next.ListboxOption[] = Array.from({ length: 40 }, (_, index) => ({
  value: `item-${index + 1}`,
  label: `Item ${index + 1}`,
}));

const RECENT: Next.ListboxOption[] = [
  { value: 'notes', label: 'Notes', icon: 'ph--file--regular' },
  { value: 'tasks', label: 'Tasks', icon: 'ph--file--regular' },
];

/**
 * A single-selection list whose rows are composed from parts (icon, text, description, a trailing action and the
 * selection indicator), except Alice's default row; a grouped multiple-selection list; a long list that scrolls in a
 * fixed-height host; and a plain `role=list` with a current row.
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => {
  const [person, setPerson] = useState<string[]>(['alice']);
  const [tags, setTags] = useState<string[]>([]);
  return (
    <>
      <Next.Listbox.Root items={PEOPLE} value={person} onValueChange={setPerson} data-testid={`people-${size}`}>
        <Next.Listbox.Label>People</Next.Listbox.Label>
        <Next.Listbox.Content>
          {PEOPLE.map((item) => (
            <Next.Listbox.Item key={item.value} item={item} data-testid={`person-${item.value}-${size}`}>
              {item.value === 'alice' ? undefined : (
                <>
                  <Next.Listbox.ItemIcon />
                  <Next.Listbox.ItemText />
                  {item.description && <Next.Listbox.ItemDescription />}
                  {item.value === 'carol' && (
                    <Next.Button icon='ph--envelope--regular' label='Message Carol' iconOnly variant='ghost' />
                  )}
                  <Next.Listbox.ItemIndicator />
                </>
              )}
            </Next.Listbox.Item>
          ))}
        </Next.Listbox.Content>
      </Next.Listbox.Root>
      <Next.Typography data-testid={`people-${size}-value`}>{person.join(', ') || 'None'}</Next.Typography>
      <Next.Listbox.Root items={TAGS} selectionMode='multiple' value={tags} onValueChange={setTags}>
        <Next.Listbox.Label>Tags</Next.Listbox.Label>
        <Next.Listbox.Content>
          <Next.Listbox.ItemGroup>
            <Next.Listbox.ItemGroupLabel>Status</Next.Listbox.ItemGroupLabel>
            {TAGS.map((item) => (
              <Next.Listbox.Item key={item.value} item={item}>
                <Next.Listbox.ItemText />
                <Next.Listbox.ItemIndicator />
              </Next.Listbox.Item>
            ))}
          </Next.Listbox.ItemGroup>
        </Next.Listbox.Content>
      </Next.Listbox.Root>
      <Next.Typography data-testid={`tags-${size}-value`}>{tags.join(', ') || 'None'}</Next.Typography>
      <div className='h-40'>
        <Next.Listbox.Root items={LONG} data-testid={`long-${size}`}>
          <Next.Listbox.Content aria-label='Long'>
            {LONG.map((item) => (
              <Next.Listbox.Item key={item.value} item={item} />
            ))}
          </Next.Listbox.Content>
        </Next.Listbox.Root>
      </div>
      <div data-place='full' className='h-40'>
        <Next.Panel.Root size={size}>
          <Next.Panel.Body data-testid={`panel-${size}`}>
            <Next.Typography data-testid={`panel-heading-${size}`}>In a panel</Next.Typography>
            <Next.Listbox.Root items={LONG}>
              <Next.Listbox.Content aria-label='In panel' scroll={false}>
                {LONG.map((item) => (
                  <Next.Listbox.Item key={item.value} item={item} />
                ))}
              </Next.Listbox.Content>
            </Next.Listbox.Root>
          </Next.Panel.Body>
        </Next.Panel.Root>
      </div>
      <Next.Listbox.Root items={RECENT} selectionMode='none'>
        <Next.Listbox.Content aria-label='Recent' data-testid={`recent-${size}`}>
          {RECENT.map((item) => (
            <Next.Listbox.Item key={item.value} item={item} current={item.value === 'tasks'} />
          ))}
        </Next.Listbox.Content>
      </Next.Listbox.Root>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-core/next/components/Listbox',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const highlighted = (listbox: HTMLElement) => listbox.querySelector('[data-highlighted]')?.textContent;

/**
 * Rows are one block tall at every size (a description adds a line), with the icon in a block-sized cell so every
 * label starts at the same x; a default row (from the option's data) lays out like one composed from parts. Groups
 * are `group`s named by their label. The listbox is named by its label, its rows are `option`s reporting `aria-selected`, and
 * a multiple list is `aria-multiselectable`. The keyboard moves the highlight (skipping the disabled row), Enter selects
 * and typeahead jumps to a match; clicks toggle in a multiple list. A long list scrolls in a thin ScrollArea keeping the
 * highlight in view. `selectionMode='none'` is a plain `list` of `listitem`s, with `aria-current` on the current row.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const { block } = GEOMETRY[size];
      const alice = byTestId(canvasElement, `person-alice-${size}`).getBoundingClientRect();
      await expect(alice.height, `${size} row`).toBeCloseTo(block, 0);
      const bob = byTestId(canvasElement, `person-bob-${size}`);
      await expect(bob.getBoundingClientRect().height, `${size} described row`).toBeGreaterThan(block);
      await expect(bob.getBoundingClientRect().height, `${size} described row`).toBeLessThan(2 * block);
      const icon = bob.querySelector<HTMLElement>('.nx-block')?.getBoundingClientRect();
      await expect(icon?.width, `${size} icon cell`).toBeCloseTo(block, 0);
      const label = (value: string) =>
        byTestId(canvasElement, `person-${value}-${size}`).querySelector('.nx-typography')?.getBoundingClientRect()
          .left;
      await expect(label('bob'), `${size} labels align`).toBeCloseTo(label('alice') ?? 0, 0);
      await expect(label('alice'), `${size} label after icon`).toBeCloseTo((icon?.left ?? 0) + block, 0);

      // Alice's default row renders the option's icon and label; Carol's composed row adds its trailing action and
      // indicator after the label, at the row's end (the indicator shows only while selected).
      const aliceRow = byTestId(canvasElement, `person-alice-${size}`);
      await expect(aliceRow.querySelector('[data-part="item-icon"] svg')).not.toBeNull();
      await expect(aliceRow.querySelector('[data-part="item-text"]')).toHaveTextContent('Alice Green');
      await expect(aliceRow.querySelector('[data-part="item-indicator"]')).toBeNull();
      const carol = byTestId(canvasElement, `person-carol-${size}`);
      const carolRect = carol.getBoundingClientRect();
      await expect(carolRect.height, `${size} composed row`).toBeCloseTo(block, 0);
      const action = within(carol).getByRole('button', { name: 'Message Carol' }).getBoundingClientRect();
      const text = carol.querySelector('[data-part="item-text"]')?.getBoundingClientRect();
      await expect(action.left, `${size} action after text`).toBeGreaterThanOrEqual((text?.right ?? 0) - 0.5);
      await expect(action.right, `${size} action at the end`).toBeLessThanOrEqual(carolRect.right + 0.5);
      await expect(action.right, `${size} action at the end`).toBeGreaterThan(carolRect.right - 2 * block);
      await expect(label('carol'), `${size} composed label aligns`).toBeCloseTo(label('alice') ?? 0, 0);
      const description = byTestId(canvasElement, `person-bob-${size}`)
        .querySelector('[data-part="item-description"]')
        ?.getBoundingClientRect();
      await expect(description?.left, `${size} description under text`).toBeCloseTo(label('bob') ?? 0, 0);
    }
    await expectScoped(canvasElement);

    const md = within(sizeRow(canvasElement, 'md'));
    const people = md.getByRole('listbox', { name: 'People' });
    await expect(md.getAllByRole('option', { name: /Alice|Bob|Carol|Dan|Erin/ })).toHaveLength(PEOPLE.length);
    await expect(md.getByRole('option', { name: /Alice/ })).toHaveAttribute('aria-selected', 'true');
    await expect(md.getByRole('option', { name: /Dan/ })).toHaveAttribute('aria-disabled', 'true');
    const selected = getComputedStyle(md.getByRole('option', { name: /Alice/ })).backgroundColor;
    await expect(selected).not.toBe(getComputedStyle(md.getByRole('option', { name: /Erin/ })).backgroundColor);

    // Keyboard: the highlight moves, skipping the disabled row; Enter selects; typeahead jumps.
    people.focus();
    await waitFor(() => expect(people).toHaveFocus());
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(highlighted(people)).toContain('Alice'));
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    await waitFor(() => expect(highlighted(people)).toContain('Erin'));
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(byTestId(canvasElement, 'people-md-value')).toHaveTextContent('erin'));
    await expect(md.getByRole('option', { name: /Erin/ })).toHaveAttribute('aria-selected', 'true');
    await expect(md.getByRole('option', { name: /Alice/ })).toHaveAttribute('aria-selected', 'false');
    await userEvent.keyboard('c');
    await waitFor(() => expect(highlighted(people)).toContain('Carol'));
    await expect(people).toHaveAttribute('aria-activedescendant', md.getByRole('option', { name: /Carol/ }).id);

    // Multiple selection toggles each clicked row.
    const tags = md.getByRole('listbox', { name: 'Tags' });
    await expect(tags).toHaveAttribute('aria-multiselectable', 'true');
    await expect(within(within(tags).getByRole('group', { name: 'Status' })).getAllByRole('option')).toHaveLength(
      TAGS.length,
    );
    await userEvent.click(within(tags).getByRole('option', { name: 'Urgent' }));
    await userEvent.click(within(tags).getByRole('option', { name: 'Idea' }));
    await waitFor(() => expect(byTestId(canvasElement, 'tags-md-value')).toHaveTextContent('urgent, idea'));
    await expect(
      within(tags).getByRole('option', { name: 'Urgent' }).querySelector('[data-part="item-indicator"]'),
    ).toBeVisible();

    // A long list scrolls in a thin ScrollArea and keeps the highlight in view.
    const long = md.getByRole('listbox', { name: 'Long' });
    await expect(long.scrollHeight).toBeGreaterThan(long.clientHeight);
    await expect(getComputedStyle(long).scrollbarWidth).toBe('none');
    long.focus();
    await userEvent.keyboard('{End}');
    await waitFor(async () => {
      const item = within(long).getByRole('option', { name: 'Item 40' });
      await expect(item).toHaveAttribute('data-highlighted');
      const itemRect = item.getBoundingClientRect();
      const viewRect = long.getBoundingClientRect();
      await expect(long.scrollTop).toBeGreaterThan(0);
      await expect(itemRect.bottom).toBeLessThanOrEqual(viewRect.bottom + 0.5);
    });

    // In a scrolling Panel with `scroll={false}`: no ScrollArea of its own, rows on the panel's rails, and the panel
    // scrolls to keep the highlight in view.
    const inPanel = md.getByRole('listbox', { name: 'In panel' });
    await expect(inPanel.closest('.nx-listbox')?.querySelector('.nx-scroll-root')).toBeNull();
    const firstRow = within(inPanel).getByRole('option', { name: 'Item 1' });
    await expect(firstRow.getBoundingClientRect().left).toBeCloseTo(
      byTestId(canvasElement, 'panel-heading-md').getBoundingClientRect().left,
      0,
    );
    // The test id names the Panel.Body frame; its viewport is what scrolls.
    const panel =
      byTestId(canvasElement, 'panel-md').querySelector<HTMLElement>(':scope > .nx-scroll-viewport') ??
      byTestId(canvasElement, 'panel-md');
    inPanel.focus();
    await userEvent.keyboard('{End}');
    await waitFor(async () => {
      const item = within(inPanel).getByRole('option', { name: 'Item 40' });
      await expect(item).toHaveAttribute('data-highlighted');
      await expect(panel.scrollTop).toBeGreaterThan(0);
      await expect(item.getBoundingClientRect().bottom).toBeLessThanOrEqual(panel.getBoundingClientRect().bottom + 0.5);
    });

    // A plain list: no listbox semantics, and a current row.
    const recent = md.getByRole('list', { name: 'Recent' });
    await expect(within(recent).getAllByRole('listitem')).toHaveLength(RECENT.length);
    await expect(within(recent).queryByRole('option')).toBeNull();
    const current = within(recent).getByRole('listitem', { current: true });
    await expect(current).toHaveTextContent('Tasks');
    await expect(getComputedStyle(current).backgroundColor).not.toBe(
      getComputedStyle(within(recent).getAllByRole('listitem')[0]).backgroundColor,
    );
  },
};
