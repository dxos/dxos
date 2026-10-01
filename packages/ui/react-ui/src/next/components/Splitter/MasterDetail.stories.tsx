//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';

// Master-detail is not a component: the list's own Root owns the selection, and a Splitter with `collapseBelow` lays
// out the list and the detail, showing one at a time when the host is narrow.

type StoryArgs = {
  /** Host width in rem; under `collapseBelow` the splitter shows one pane at a time. */
  width: number;
  /** The list pane's width in rem. */
  size: number;
  collapseBelow: string;
  resizable: boolean;
};

type Project = Next.ListboxOption & { owner: string; status: string; updated: string };

const OWNERS = ['Alice Green', 'Bob Grey', 'Carol Black', 'Erin White'];
const STATUSES = ['Active', 'Paused', 'Done'];
const ICONS = ['ph--rocket--regular', 'ph--flask--regular', 'ph--book--regular', 'ph--globe--regular'];
const NAMES = [
  'Apollo',
  'Borealis',
  'Cassini',
  'Dawn',
  'Europa',
  'Fermi',
  'Gemini',
  'Hubble',
  'Ion',
  'Juno',
  'Kepler',
  'Lunar',
];

const PROJECTS: Project[] = NAMES.map((name, index) => ({
  value: name.toLowerCase(),
  label: name,
  icon: ICONS[index % ICONS.length],
  description: `${STATUSES[index % STATUSES.length]} · ${OWNERS[index % OWNERS.length]}`,
  owner: OWNERS[index % OWNERS.length],
  status: STATUSES[index % STATUSES.length],
  updated: `2026-0${(index % 9) + 1}-1${index % 10}`,
}));

const projectOf = (value?: string) => PROJECTS.find((project) => project.value === value);

const tasksOf = (project: Project): Next.ListboxOption[] =>
  ['Plan', 'Build', 'Review', 'Ship'].map((step) => ({
    value: `${project.value}-${step.toLowerCase()}`,
    label: `${step} ${project.label}`,
    icon: 'ph--check-square--regular',
    description: project.owner,
  }));

/** The story's host, sized by the `width` arg so the collapse can be seen (and set by the play). */
const Host = ({ width, children }: PropsWithChildren<Pick<StoryArgs, 'width'>>) => (
  <div className='flex h-[28rem] border border-separator' style={{ width: `${width}rem` }} data-testid='host'>
    {children}
  </div>
);

/** Returns the collapsed splitter to its list; renders nothing while both panes show. */
const BackButton = ({ testId = 'back' }: { testId?: string }) => {
  const { collapsed, setMode } = Next.Splitter.useContext();
  return collapsed ? (
    <Next.Button
      icon='ph--caret-left--regular'
      label='Back'
      iconOnly
      onClick={() => setMode('start')}
      data-testid={testId}
    />
  ) : null;
};

/** The selected record, or `Empty` when nothing is selected. */
const Detail = ({ item }: { item?: Next.ListboxOption }) => {
  const project = projectOf(item?.value);
  return (
    <Next.Panel.Root data-testid='detail'>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <BackButton />
          <Next.Toolbar.Text data-testid='detail-title'>{item?.label ?? 'Projects'}</Next.Toolbar.Text>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body>
        {project ? (
          <>
            <Next.Typography>{project.description}</Next.Typography>
            <Next.Typography tone='description'>Owner</Next.Typography>
            <Next.Typography>{project.owner}</Next.Typography>
            <Next.Typography tone='description'>Status</Next.Typography>
            <Next.Typography>{project.status}</Next.Typography>
            <Next.Typography tone='description'>Updated</Next.Typography>
            <Next.Typography>{project.updated}</Next.Typography>
          </>
        ) : (
          <Next.Empty icon='ph--cursor-click--regular' data-testid='detail-empty'>
            Select a project
          </Next.Empty>
        )}
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

/** The detail reads the selection from the list's own Root context; no master-detail state of its own. */
const ListboxDetail = () => {
  const { selectedItems } = Next.Listbox.useContext();
  return <Detail item={selectedItems[0]} />;
};

/**
 * The list pane: while collapsed, choosing a row (even the selected one, after Back) opens the detail; while both panes
 * show, the detail is already beside it, so the mode stays on the list and a later collapse lands there.
 */
const ListboxMaster = ({ items, label }: { items: Next.ListboxOption[]; label: string }) => {
  const { collapsed, setMode } = Next.Splitter.useContext();
  const open = () => collapsed && setMode('end');
  return (
    <Next.Listbox.Content
      aria-label={label}
      onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && open()}
    >
      {items.map((item) => (
        <Next.Listbox.Item key={item.value} item={item} onClick={open} data-testid={`item-${item.value}`} />
      ))}
    </Next.Listbox.Content>
  );
};

//
// Listbox
//

const ListboxStory = ({ width, size: defaultSize, collapseBelow, resizable }: StoryArgs) => {
  const [size, setSize] = useState(defaultSize);
  const [mode, setMode] = useState<Next.SplitterMode>('start');
  return (
    <Host width={width}>
      <Next.Listbox.Root items={PROJECTS} classNames='dx-fill'>
        <Next.Splitter.Root
          orientation='horizontal'
          mode={mode}
          onModeChange={setMode}
          collapseBelow={collapseBelow}
          resizable={resizable}
          size={size}
          onSizeChange={setSize}
          minSize={10}
        >
          <Next.Splitter.Panel position='start' data-testid='master'>
            <ListboxMaster items={PROJECTS} label='Projects' />
          </Next.Splitter.Panel>
          <Next.Splitter.ResizeTrigger aria-label='Resize' />
          <Next.Splitter.Panel position='end'>
            <ListboxDetail />
          </Next.Splitter.Panel>
        </Next.Splitter.Root>
      </Next.Listbox.Root>
    </Host>
  );
};

//
// Tabs
//

/** The tab list as the master; the splitter's mode is uncontrolled here, set through its context. */
const TabsMaster = () => {
  const { collapsed, setMode } = Next.Splitter.useContext();
  return (
    <Next.Tabs.List aria-label='Projects' data-testid='master-list'>
      {PROJECTS.map((project) => (
        <Next.Tabs.Trigger
          key={project.value}
          value={project.value}
          icon={project.icon}
          label={project.label}
          onClick={() => collapsed && setMode('end')}
          data-testid={`item-${project.value}`}
        />
      ))}
    </Next.Tabs.List>
  );
};

const TabsDetail = () => {
  const { value } = Next.Tabs.useContext();
  const project = projectOf(value ?? undefined);
  return (
    <Next.Panel.Root data-testid='detail'>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <BackButton />
          <Next.Toolbar.Text data-testid='detail-title'>{project?.label ?? 'Projects'}</Next.Toolbar.Text>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body>
        {project ? (
          PROJECTS.map((project) => (
            <Next.Tabs.Content key={project.value} value={project.value}>
              <Next.Typography>{project.description}</Next.Typography>
              <Next.Typography tone='description'>Updated {project.updated}</Next.Typography>
            </Next.Tabs.Content>
          ))
        ) : (
          <Next.Empty icon='ph--cursor-click--regular' data-testid='detail-empty'>
            Select a project
          </Next.Empty>
        )}
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

const TabsStory = ({ width, size, collapseBelow, resizable }: StoryArgs) => (
  <Host width={width}>
    <Next.Tabs.Root orientation='vertical' classNames='dx-fill'>
      <Next.Splitter.Root
        orientation='horizontal'
        defaultMode='start'
        collapseBelow={collapseBelow}
        resizable={resizable}
        defaultSize={size}
        minSize={10}
      >
        <Next.Splitter.Panel position='start' data-testid='master'>
          <TabsMaster />
        </Next.Splitter.Panel>
        <Next.Splitter.ResizeTrigger aria-label='Resize' />
        <Next.Splitter.Panel position='end'>
          <TabsDetail />
        </Next.Splitter.Panel>
      </Next.Splitter.Root>
    </Next.Tabs.Root>
  </Host>
);

//
// Nested
//

/** The outer detail holds its own master-detail: the project's tasks, collapsing at a narrower width. */
const NestedDetail = () => {
  const { selectedItems } = Next.Listbox.useContext();
  const project = projectOf(selectedItems[0]?.value);
  if (!project) {
    return <Detail />;
  }

  const tasks = tasksOf(project);
  return (
    <Next.Panel.Root data-testid='detail'>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <BackButton />
          <Next.Toolbar.Text data-testid='detail-title'>{project.label}</Next.Toolbar.Text>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Listbox.Root key={project.value} items={tasks} classNames='dx-fill'>
        <Next.Splitter.Root orientation='horizontal' defaultMode='start' collapseBelow='24rem' size={12}>
          <Next.Splitter.Panel position='start'>
            <ListboxMaster items={tasks} label='Tasks' />
          </Next.Splitter.Panel>
          <Next.Splitter.Panel position='end'>
            <TaskDetail />
          </Next.Splitter.Panel>
        </Next.Splitter.Root>
      </Next.Listbox.Root>
    </Next.Panel.Root>
  );
};

const TaskDetail = () => {
  const { selectedItems } = Next.Listbox.useContext();
  const task = selectedItems[0];
  return (
    <Next.Panel.Root>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <BackButton testId='task-back' />
          <Next.Toolbar.Text>{task?.label ?? 'Tasks'}</Next.Toolbar.Text>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body>
        {task ? (
          <Next.Typography>Assigned to {task.description}</Next.Typography>
        ) : (
          <Next.Empty icon='ph--cursor-click--regular'>Select a task</Next.Empty>
        )}
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

const NestedStory = ({ width, size, collapseBelow, resizable }: StoryArgs) => {
  const [mode, setMode] = useState<Next.SplitterMode>('start');
  return (
    <Host width={width}>
      <Next.Listbox.Root items={PROJECTS} classNames='dx-fill'>
        <Next.Splitter.Root
          orientation='horizontal'
          mode={mode}
          onModeChange={setMode}
          collapseBelow={collapseBelow}
          resizable={resizable}
          defaultSize={size}
          minSize={10}
        >
          <Next.Splitter.Panel position='start' data-testid='master'>
            <ListboxMaster items={PROJECTS} label='Projects' />
          </Next.Splitter.Panel>
          <Next.Splitter.ResizeTrigger aria-label='Resize' />
          <Next.Splitter.Panel position='end'>
            <NestedDetail />
          </Next.Splitter.Panel>
        </Next.Splitter.Root>
      </Next.Listbox.Root>
    </Host>
  );
};

const meta = {
  title: 'ui/react-ui-core/next/components/Splitter/MasterDetail',
  render: ListboxStory,
  decorators: [withLayout({ classNames: 'p-0' }), withTheme()],
  args: { width: 48, size: 16, collapseBelow: '32rem', resizable: true },
  argTypes: {
    width: { control: { type: 'range', min: 16, max: 80, step: 1 } },
    size: { control: { type: 'range', min: 10, max: 32, step: 1 } },
    collapseBelow: { control: 'text' },
  },
  parameters: { layout: 'centered', translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Listbox: Story = {};

export const Tabs: Story = { render: TabsStory };

/** A draggable seam between list and detail. */
export const Resizable: Story = { args: { resizable: true } };

/** No seam: the list pane holds `size`. */
export const Fixed: Story = { args: { resizable: false, size: 20 } };

/** Narrow from the start: one pane at a time. */
export const Narrow: Story = { args: { width: 24 } };

export const Nested: Story = { render: NestedStory, args: { width: 64, size: 14, collapseBelow: '36rem' } };

const isShown = (element: HTMLElement) => element.getBoundingClientRect().width > 1;

/** Wide shows both panes; narrow shows the list, then the detail on selection, then the list again on Back. */
export const Test: Story = {
  args: { width: 48, resizable: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const host = canvas.getByTestId('host');
    const master = canvas.getByTestId('master');
    const detail = () => canvas.getByTestId('detail');

    // Wide: both panes, nothing selected yet.
    await waitFor(() => expect(isShown(master) && isShown(detail())).toBe(true));
    await expect(canvas.getByTestId('detail-empty')).toBeInTheDocument();
    await expect(canvas.queryByTestId('back')).toBeNull();

    // Selecting shows the item beside the list.
    await userEvent.click(canvas.getByTestId('item-cassini'));
    await waitFor(() => expect(canvas.getByTestId('detail-title')).toHaveTextContent('Cassini'));
    await expect(isShown(master)).toBe(true);

    // Narrow: the list alone, since the selection beside it never asked for the detail.
    host.style.width = '24rem';
    await waitFor(() => expect(isShown(master) && !isShown(detail())).toBe(true));

    // Selecting shows only the detail.
    await userEvent.click(canvas.getByTestId('item-juno'));
    await waitFor(() => expect(!isShown(master) && isShown(detail())).toBe(true));
    await expect(canvas.getByTestId('detail-title')).toHaveTextContent('Juno');

    // Back returns to the list.
    await userEvent.click(canvas.getByTestId('back'));
    await waitFor(() => expect(isShown(master) && !isShown(detail())).toBe(true));

    // Wide again: both panes, and no Back.
    host.style.width = '48rem';
    await waitFor(() => expect(isShown(master) && isShown(detail())).toBe(true));
    await waitFor(() => expect(canvas.queryByTestId('back')).toBeNull());
  },
};
