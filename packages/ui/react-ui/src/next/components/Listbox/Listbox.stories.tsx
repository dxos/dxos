//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import * as Button from '../Button/Button.tsx';
import * as Checkbox from '../Checkbox/Checkbox.tsx';
import * as Container from '../Container/Container.tsx';
import * as Panel from '../Panel/Panel.tsx';
import * as ScrollArea from '../ScrollArea/ScrollArea.tsx';
import * as SystemButton from '../SystemButton/SystemButton.tsx';
import * as Typography from '../Typography/Typography.tsx';
import * as Listbox from './Listbox.tsx';

const PEOPLE: Listbox.Option[] = [
  { value: 'alice', label: 'Alice Green', icon: 'ph--user--regular' },
  { value: 'bob', label: 'Bob Grey', icon: 'ph--user--regular', description: 'Away until Monday' },
  { value: 'carol', label: 'Carol Black', icon: 'ph--user--regular' },
  { value: 'dan', label: 'Dan Brown', icon: 'ph--user--regular', disabled: true },
  { value: 'erin', label: 'Erin White', icon: 'ph--user--regular' },
];

const TAGS: Listbox.Option[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'later', label: 'Later' },
  { value: 'idea', label: 'Idea' },
];

const LONG: Listbox.Option[] = Array.from({ length: 40 }, (_, index) => ({
  value: `item-${index + 1}`,
  label: `Item ${index + 1}`,
}));

const TASKS: Listbox.Option[] = [
  { value: 'report', label: 'Write report' },
  { value: 'review', label: 'Review budget' },
];

const MANY: Listbox.Option[] = Array.from({ length: 1_000 }, (_, index) => ({
  value: `row-${index + 1}`,
  label: `Row ${index + 1}`,
}));

const FILES: Listbox.Option[] = [
  { value: 'a', label: 'Annual plan', icon: 'ph--file--regular', description: '12 KB' },
  { value: 'b', label: 'Budget', icon: 'ph--table--regular', description: '1.4 MB' },
];

const NONE: Listbox.Option[] = [];

const RECENT: Listbox.Option[] = [
  { value: 'notes', label: 'Notes', icon: 'ph--file--regular' },
  { value: 'tasks', label: 'Tasks', icon: 'ph--file--regular' },
];

/**
 * A single-selection list whose rows are composed from parts (icon, text, description, a trailing action and the
 * selection indicator), except Alice's default row; a grouped multiple-selection list; a long list that scrolls in a
 * fixed-height host; a list with no selection and a current row; rows with controls (the grid keyboard); a windowed
 * 1,000-row list; rows sharing Root `columns`; and an empty list.
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => {
  const [person, setPerson] = useState<string[]>(['alice']);
  const [tags, setTags] = useState<string[]>([]);
  const [tasks, setTasks] = useState(TASKS);
  return (
    <>
      <Listbox.Root items={PEOPLE} value={person} onValueChange={setPerson} data-testid={`people-${size}`}>
        <Listbox.Label>People</Listbox.Label>
        <Listbox.Content>
          {PEOPLE.map((item) => (
            <Listbox.Item key={item.value} item={item} data-testid={`person-${item.value}-${size}`}>
              {item.value === 'alice' ? undefined : (
                <>
                  <Listbox.ItemIcon />
                  <Listbox.ItemText />
                  {item.description && <Listbox.ItemDescription />}
                  {item.value === 'carol' && (
                    <Button.Button icon='ph--envelope--regular' label='Message Carol' iconOnly variant='ghost' />
                  )}
                  <Listbox.ItemIndicator />
                </>
              )}
            </Listbox.Item>
          ))}
        </Listbox.Content>
      </Listbox.Root>
      <Typography.Typography data-testid={`people-${size}-value`}>{person.join(', ') || 'None'}</Typography.Typography>
      <Listbox.Root items={TAGS} selectionMode='multiple' value={tags} onValueChange={setTags}>
        <Listbox.Label>Tags</Listbox.Label>
        <Listbox.Content>
          <Listbox.ItemGroup>
            <Listbox.ItemGroupLabel>Status</Listbox.ItemGroupLabel>
            {TAGS.map((item) => (
              <Listbox.Item key={item.value} item={item}>
                <Listbox.ItemText />
                <Listbox.ItemIndicator />
              </Listbox.Item>
            ))}
          </Listbox.ItemGroup>
        </Listbox.Content>
      </Listbox.Root>
      <Typography.Typography data-testid={`tags-${size}-value`}>{tags.join(', ') || 'None'}</Typography.Typography>
      <div className='h-40'>
        <Listbox.Root items={LONG} data-testid={`long-${size}`}>
          <Listbox.Content aria-label='Long'>
            {LONG.map((item) => (
              <Listbox.Item key={item.value} item={item} />
            ))}
          </Listbox.Content>
        </Listbox.Root>
      </div>
      <div data-place='full' className='h-40'>
        <Panel.Root size={size}>
          <Panel.Body asChild data-testid={`panel-${size}`}>
            <ScrollArea.Root>
              <ScrollArea.Viewport asChild>
                <Container.Container gutter='rail'>
                  <Typography.Typography data-testid={`panel-heading-${size}`}>In a panel</Typography.Typography>
                  <Listbox.Root items={LONG}>
                    <Listbox.Content aria-label='In panel' scroll={false}>
                      {LONG.map((item) => (
                        <Listbox.Item key={item.value} item={item} />
                      ))}
                    </Listbox.Content>
                  </Listbox.Root>
                </Container.Container>
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Panel.Body>
        </Panel.Root>
      </div>
      <Listbox.Root items={RECENT} selectionMode='none'>
        <Listbox.Content aria-label='Recent' data-testid={`recent-${size}`}>
          {RECENT.map((item) => (
            <Listbox.Item key={item.value} item={item} current={item.value === 'tasks'}>
              <Listbox.ItemIcon hue='amber' />
              <Listbox.ItemText />
            </Listbox.Item>
          ))}
        </Listbox.Content>
      </Listbox.Root>
      <Listbox.Root items={tasks} selectionMode='none'>
        <Listbox.Label>Tasks</Listbox.Label>
        <Listbox.Content data-testid={`tasks-${size}`}>
          {tasks.map((item) => (
            <Listbox.Item key={item.value} item={item} data-testid={`task-${item.value}-${size}`}>
              <Checkbox.Checkbox aria-label={`Done ${item.label}`} />
              <Listbox.ItemText />
              <Button.Button icon='ph--pen--regular' label={`Edit ${item.label}`} iconOnly variant='ghost' />
              <SystemButton.Remove
                onClick={() => setTasks((tasks) => tasks.filter((task) => task.value !== item.value))}
              />
            </Listbox.Item>
          ))}
        </Listbox.Content>
        <Listbox.Empty icon='ph--check-circle--regular'>All done</Listbox.Empty>
      </Listbox.Root>
      <div className='h-40'>
        <Listbox.Root items={MANY} virtual='fixed'>
          <Listbox.Content aria-label='Many' data-testid={`many-${size}`}>
            {MANY.map((item) => (
              <Listbox.Item key={item.value} item={item} />
            ))}
          </Listbox.Content>
        </Listbox.Root>
      </div>
      <div className='h-40'>
        <Listbox.Root items={LONG} virtual='variable'>
          <Listbox.Content aria-label='Variable' data-testid={`variable-${size}`}>
            {LONG.map((item) => (
              <Listbox.Item key={item.value} item={item} />
            ))}
          </Listbox.Content>
        </Listbox.Root>
      </div>
      <Listbox.Root items={FILES} columns='var(--dx-block-size) minmax(0, 1fr) 5rem'>
        <Listbox.Content aria-label='Files'>
          {FILES.map((item) => (
            <Listbox.Item key={item.value} item={item} data-testid={`file-${item.value}-${size}`}>
              <Listbox.ItemIcon />
              <Listbox.ItemText />
              <Listbox.ItemDescription />
            </Listbox.Item>
          ))}
        </Listbox.Content>
      </Listbox.Root>
      <Listbox.Root items={NONE}>
        <Listbox.Content aria-label='Nothing' />
        <Listbox.Empty data-testid={`empty-${size}`} />
      </Listbox.Root>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Listbox',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// The active descendant, which zag marks `data-highlighted` only while focus is visible (a ref it does not re-render on).
const highlighted = (listbox: HTMLElement) =>
  listbox.ownerDocument.getElementById(listbox.getAttribute('aria-activedescendant') ?? '')?.textContent;

/**
 * Rows are one block tall at every size (a description adds a line), with the icon in a block-sized cell so every
 * label starts at the same x; a default row (from the option's data) lays out like one composed from parts. Groups
 * are `group`s named by their label. The listbox is named by its label, its rows are `option`s reporting `aria-selected`, and
 * a multiple list is `aria-multiselectable`. The keyboard moves the highlight (skipping the disabled row), Enter selects
 * and typeahead jumps to a match; clicks toggle in a multiple list. A long list scrolls in a thin ScrollArea keeping the
 * highlight in view. `selectionMode='none'` keeps the machine and selects nothing; the grid keyboard enters rows; windowed,
 * deferred and column-sharing lists; Empty.
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
      const icon = bob.querySelector<HTMLElement>('.dx-block')?.getBoundingClientRect();
      await expect(icon?.width, `${size} icon cell`).toBeCloseTo(block, 0);
      const label = (value: string) =>
        byTestId(canvasElement, `person-${value}-${size}`).querySelector('.dx-typography')?.getBoundingClientRect()
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
    await expect(inPanel.closest('.dx-listbox')?.querySelector('.dx-scroll-root')).toBeNull();
    const firstRow = within(inPanel).getByRole('option', { name: 'Item 1' });
    await expect(firstRow.getBoundingClientRect().left).toBeCloseTo(
      byTestId(canvasElement, 'panel-heading-md').getBoundingClientRect().left,
      0,
    );
    // The test id names the Panel.Body frame; its viewport is what scrolls.
    const panel =
      byTestId(canvasElement, 'panel-md').querySelector<HTMLElement>(':scope > .dx-scroll-viewport') ??
      byTestId(canvasElement, 'panel-md');
    inPanel.focus();
    await userEvent.keyboard('{End}');
    await waitFor(async () => {
      const item = within(inPanel).getByRole('option', { name: 'Item 40' });
      await expect(item).toHaveAttribute('data-highlighted');
      await expect(panel.scrollTop).toBeGreaterThan(0);
      await expect(item.getBoundingClientRect().bottom).toBeLessThanOrEqual(panel.getBoundingClientRect().bottom + 0.5);
    });

    // No selection: the list still runs the listbox machine (navigation, typeahead), selects nothing, and shows the
    // current row; an ItemIcon forwards its hue.
    const recent = md.getByRole('listbox', { name: 'Recent' });
    await expect(within(recent).getAllByRole('option')).toHaveLength(RECENT.length);
    const current = within(recent).getByRole('option', { current: true });
    await expect(current).toHaveTextContent('Tasks');
    await expect(getComputedStyle(current).backgroundColor).not.toBe(
      getComputedStyle(within(recent).getAllByRole('option')[0]).backgroundColor,
    );
    await expect(current.querySelector('[data-part="item-icon"] svg')).toHaveAttribute('data-hue', 'amber');
    await userEvent.click(within(recent).getByRole('option', { name: 'Notes' }));
    await expect(within(recent).queryByRole('option', { selected: true })).toBeNull();

    // The grid keyboard: row controls are out of the tab order; ArrowRight enters the highlighted row, Tab cycles its
    // controls, ArrowLeft and Escape return to the list. Remove is named by the row's text.
    const tasks = md.getByRole('listbox', { name: 'Tasks' });
    const report = within(tasks).getByRole('option', { name: /Write report/ });
    const controls = [
      within(report).getByRole('checkbox', { name: 'Done Write report' }),
      within(report).getByRole('button', { name: 'Edit Write report' }),
      within(report).getByRole('button', { name: 'Delete Write report' }),
    ];
    for (const control of controls) {
      await expect(control).toHaveAttribute('tabindex', '-1');
    }
    tasks.focus();
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(highlighted(tasks)).toContain('Write report'));
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(controls[0]).toHaveFocus());
    await userEvent.keyboard('{Tab}');
    await waitFor(() => expect(controls[1]).toHaveFocus());
    await userEvent.keyboard('{Tab}');
    await waitFor(() => expect(controls[2]).toHaveFocus());
    await userEvent.keyboard('{Tab}');
    await waitFor(() => expect(controls[0]).toHaveFocus());
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await waitFor(() => expect(controls[2]).toHaveFocus());
    // Arrows inside a row belong to its control, not the list.
    await userEvent.keyboard('{ArrowDown}');
    await expect(highlighted(tasks)).toContain('Write report');
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => expect(tasks).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}{ArrowRight}');
    await waitFor(() => expect(within(tasks).getByRole('checkbox', { name: 'Done Review budget' })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(tasks).toHaveFocus());
    // A click on a control acts on the control and makes its row current, without taking focus to the list.
    await userEvent.click(controls[1]);
    await waitFor(() => expect(controls[1]).toHaveFocus());
    await waitFor(() => expect(highlighted(tasks)).toContain('Write report'));
    // Removing every row shows the Empty part.
    await expect(md.queryByText('All done')).toBeNull();
    await userEvent.click(within(tasks).getByRole('button', { name: 'Delete Write report' }));
    await userEvent.click(within(tasks).getByRole('button', { name: 'Delete Review budget' }));
    await waitFor(() => expect(md.getByText('All done')).toBeVisible());

    // `virtual='fixed'`: a 1,000-row list mounts only a window of rows between spacers, and the keyboard reaches the
    // last row, which mounts in view.
    const many = md.getByRole('listbox', { name: 'Many' });
    await expect(within(many).getAllByRole('option').length).toBeLessThan(60);
    await expect(many.scrollHeight).toBeGreaterThan(MANY.length * GEOMETRY.md.block * 0.9);
    many.focus();
    await userEvent.keyboard('{End}');
    await waitFor(async () => {
      const last = within(many).getByRole('option', { name: 'Row 1000' });
      await expect(last).toHaveAttribute('data-highlighted');
      await expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(many.getBoundingClientRect().bottom + 0.5);
    });
    await expect(within(many).queryByRole('option', { name: 'Row 1' })).toBeNull();
    await userEvent.keyboard('{Home}');
    await waitFor(() =>
      expect(within(many).getByRole('option', { name: 'Row 1' })).toHaveAttribute('data-highlighted'),
    );

    // `virtual='variable'`: every row mounts and defers its layout off screen.
    const variable = md.getByRole('listbox', { name: 'Variable' });
    await expect(within(variable).getAllByRole('option')).toHaveLength(LONG.length);
    await expect(getComputedStyle(within(variable).getAllByRole('option')[0]).contentVisibility).toBe('auto');

    // Root `columns`: rows are subgrids of the shared tracks, so every row's third cell starts at the same x.
    const third = (value: string) =>
      byTestId(canvasElement, `file-${value}-md`)
        .querySelector('[data-part="item-description"]')
        ?.getBoundingClientRect();
    await expect(third('a')?.left).toBeCloseTo(third('b')?.left ?? 0, 0);
    await expect(third('a')?.width).toBeCloseTo(80, 0);

    // An empty list shows its Empty part with the default text.
    await expect(byTestId(canvasElement, 'empty-md')).toHaveTextContent('No items');
  },
};
