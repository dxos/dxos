//
// Copyright 2026 DXOS.org
//

import '../next/theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ComponentPropsWithoutRef, type PropsWithChildren, forwardRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { Button } from '../next/components/Button/Button.tsx';
import { Container } from '../next/components/Container/Container.tsx';
import { Empty } from '../next/components/Empty/Empty.tsx';
import * as ListboxModule from '../next/components/Listbox/Listbox.tsx';
import * as Panel from '../next/components/Panel/Panel.tsx';
import * as ScrollArea from '../next/components/ScrollArea/ScrollArea.tsx';
import * as Splitter from '../next/components/Splitter/Splitter.tsx';
import * as TabsModule from '../next/components/Tabs/Tabs.tsx';
import * as Toolbar from '../next/components/Toolbar/Toolbar.tsx';
import * as Typography from '../next/components/Typography/Typography.tsx';
import { withLayout, withTheme } from '../testing/index.ts';

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

type Project = ListboxModule.Option & { owner: string; status: string; updated: string };

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

const tasksOf = (project: Project): ListboxModule.Option[] =>
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
  const { collapsed, setMode } = Splitter.useContext();
  return collapsed ? (
    <Button
      icon='ph--caret-left--regular'
      label='Back'
      iconOnly
      onClick={() => setMode('start')}
      data-testid={testId}
    />
  ) : null;
};

/** The list pane: a header bar naming the list (with its count) over a body whose rails the rows inherit. */
const MasterPane = ({ title, count, children }: PropsWithChildren<{ title: string; count: number }>) => (
  <Panel.Root>
    <Panel.Header>
      <Toolbar.Root>
        <Toolbar.Text>{title}</Toolbar.Text>
        <Toolbar.Text classNames='flex-none'>
          <Typography.Text tone='muted'>{count}</Typography.Text>
        </Toolbar.Text>
      </Toolbar.Root>
    </Panel.Header>
    <Panel.Body asChild>
      <ScrollArea.Root>
        <ScrollArea.Viewport asChild>
          <Container gutter='rail'>{children}</Container>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Body>
  </Panel.Root>
);

type DetailPaneProps = ComponentPropsWithoutRef<'div'> & { title: string; backTestId?: string };

/** The detail pane: the same header bar (Back first while collapsed) over the caller's body; forwards for `asChild`. */
const DetailPane = forwardRef<HTMLDivElement, DetailPaneProps>(
  ({ title, backTestId, children, ...props }, forwardedRef) => (
    <Panel.Root data-testid='detail' {...props} ref={forwardedRef}>
      <Panel.Header>
        <Toolbar.Root>
          <BackButton testId={backTestId} />
          <Toolbar.Text data-testid={backTestId ? undefined : 'detail-title'}>{title}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      {children}
    </Panel.Root>
  ),
);

/** Label and value pairs on two tracks of their own, between the panel's rails (one track once the pane is narrow). */
const Fields = ({ fields }: { fields: [label: string, value: string][] }) => (
  <Panel.Body asChild>
    <ScrollArea.Root>
      <ScrollArea.Viewport asChild>
        <Container gutter='rail'>
          <Container gutter='inherit' layout='row' columns='minmax(0, 6rem) minmax(0, 1fr)' gap='sm'>
            {fields.flatMap(([label, value]) => [
              <Typography.Text key={`${label}-label`} tone='muted'>
                {label}
              </Typography.Text>,
              <Typography.Text key={`${label}-value`} truncate>
                {value}
              </Typography.Text>,
            ])}
          </Container>
        </Container>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  </Panel.Body>
);

const EmptyBody = ({ children, testId }: PropsWithChildren<{ testId?: string }>) => (
  <Panel.Body asChild>
    <ScrollArea.Root>
      <ScrollArea.Viewport asChild>
        <Container gutter='rail'>
          <Empty icon='ph--cursor-click--regular' data-testid={testId}>
            {children}
          </Empty>
        </Container>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  </Panel.Body>
);

const projectFields = (project: Project): [string, string][] => [
  ['Owner', project.owner],
  ['Status', project.status],
  ['Updated', project.updated],
  ['Summary', project.description ?? ''],
];

/** The selected project, or `Empty` when nothing is selected. */
const ProjectDetail = ({ item }: { item?: ListboxModule.Option }) => {
  const project = projectOf(item?.value);
  return (
    <DetailPane title={project?.label ?? 'No selection'}>
      {project ? (
        <Fields fields={projectFields(project)} />
      ) : (
        <EmptyBody testId='detail-empty'>Select a project</EmptyBody>
      )}
    </DetailPane>
  );
};

/** The detail reads the selection from the list's own Root context; no master-detail state of its own. */
const ListboxDetail = () => {
  const { selectedItems } = ListboxModule.useContext();
  return <ProjectDetail item={selectedItems[0]} />;
};

/**
 * The list: while collapsed, choosing a row (even the selected one, after Back) opens the detail; while both panes
 * show, the detail is already beside it, so the mode stays on the list and a later collapse lands there.
 */
const ListboxMaster = ({ items, label }: { items: ListboxModule.Option[]; label: string }) => {
  const { collapsed, setMode } = Splitter.useContext();
  const open = () => collapsed && setMode('end');
  return (
    <MasterPane title={label} count={items.length}>
      <ListboxModule.Content
        scroll={false}
        aria-label={label}
        onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && open()}
      >
        {items.map((item) => (
          <ListboxModule.Item key={item.value} item={item} onClick={open} data-testid={`item-${item.value}`} />
        ))}
      </ListboxModule.Content>
    </MasterPane>
  );
};

//
// Listbox
//

const ListboxStory = ({ width, size: defaultSize, collapseBelow, resizable }: StoryArgs) => {
  const [size, setSize] = useState(defaultSize);
  const [mode, setMode] = useState<Splitter.Mode>('start');
  return (
    <Host width={width}>
      <ListboxModule.Root items={PROJECTS} classNames='dx-fill'>
        <Splitter.Root
          orientation='horizontal'
          mode={mode}
          onModeChange={setMode}
          collapseBelow={collapseBelow}
          resizable={resizable}
          size={size}
          onSizeChange={setSize}
          minSize={10}
        >
          <Splitter.Panel position='start' data-testid='master'>
            <ListboxMaster items={PROJECTS} label='Projects' />
          </Splitter.Panel>
          <Splitter.ResizeTrigger aria-label='Resize' />
          <Splitter.Panel position='end'>
            <ListboxDetail />
          </Splitter.Panel>
        </Splitter.Root>
      </ListboxModule.Root>
    </Host>
  );
};

//
// Tabs
//

/** The tab list as the master; the splitter's mode is uncontrolled here, set through its context. */
const TabsMaster = () => {
  const { collapsed, setMode } = Splitter.useContext();
  return (
    <MasterPane title='Projects' count={PROJECTS.length}>
      <TabsModule.List aria-label='Projects' data-testid='master-list'>
        {PROJECTS.map((project) => (
          <TabsModule.Trigger
            key={project.value}
            value={project.value}
            icon={project.icon}
            label={project.label}
            onClick={() => collapsed && setMode('end')}
            data-testid={`item-${project.value}`}
          />
        ))}
      </TabsModule.List>
    </MasterPane>
  );
};

/** Each tab's panel is the detail pane itself (`asChild`); before a tab is chosen the pane shows `Empty`. */
const TabsDetail = () => {
  const { value } = TabsModule.useContext();
  return (
    <>
      {PROJECTS.map((project) => (
        <TabsModule.Content key={project.value} value={project.value} asChild>
          <DetailPane title={project.label}>
            <Fields fields={projectFields(project)} />
          </DetailPane>
        </TabsModule.Content>
      ))}
      {!value && (
        <DetailPane title='No selection'>
          <EmptyBody testId='detail-empty'>Select a project</EmptyBody>
        </DetailPane>
      )}
    </>
  );
};

const TabsStory = ({ width, size, collapseBelow, resizable }: StoryArgs) => (
  <Host width={width}>
    <TabsModule.Root orientation='vertical' classNames='dx-fill'>
      <Splitter.Root
        orientation='horizontal'
        defaultMode='start'
        collapseBelow={collapseBelow}
        resizable={resizable}
        defaultSize={size}
        minSize={10}
      >
        <Splitter.Panel position='start' data-testid='master'>
          <TabsMaster />
        </Splitter.Panel>
        <Splitter.ResizeTrigger aria-label='Resize' />
        <Splitter.Panel position='end'>
          <TabsDetail />
        </Splitter.Panel>
      </Splitter.Root>
    </TabsModule.Root>
  </Host>
);

//
// Nested
//

/** The outer detail holds its own master-detail: the project's tasks, collapsing at a narrower width. */
const NestedDetail = () => {
  const { selectedItems } = ListboxModule.useContext();
  const project = projectOf(selectedItems[0]?.value);
  if (!project) {
    return <ProjectDetail />;
  }

  const tasks = tasksOf(project);
  return (
    <DetailPane title={project.label}>
      <ListboxModule.Root key={project.value} items={tasks} classNames='dx-fill'>
        <Splitter.Root orientation='horizontal' defaultMode='start' collapseBelow='24rem' size={12}>
          <Splitter.Panel position='start'>
            <ListboxMaster items={tasks} label='Tasks' />
          </Splitter.Panel>
          <Splitter.ResizeTrigger />
          <Splitter.Panel position='end'>
            <TaskDetail />
          </Splitter.Panel>
        </Splitter.Root>
      </ListboxModule.Root>
    </DetailPane>
  );
};

const TaskDetail = () => {
  const { selectedItems } = ListboxModule.useContext();
  const task = selectedItems[0];
  return (
    <DetailPane title={task?.label ?? 'No selection'} backTestId='task-back' data-testid='task-detail'>
      {task ? (
        <Fields
          fields={[
            ['Task', task.label],
            ['Assignee', task.description ?? ''],
          ]}
        />
      ) : (
        <EmptyBody>Select a task</EmptyBody>
      )}
    </DetailPane>
  );
};

const NestedStory = ({ width, size, collapseBelow, resizable }: StoryArgs) => {
  const [mode, setMode] = useState<Splitter.Mode>('start');
  return (
    <Host width={width}>
      <ListboxModule.Root items={PROJECTS} classNames='dx-fill'>
        <Splitter.Root
          orientation='horizontal'
          mode={mode}
          onModeChange={setMode}
          collapseBelow={collapseBelow}
          resizable={resizable}
          defaultSize={size}
          minSize={10}
        >
          <Splitter.Panel position='start' data-testid='master'>
            <ListboxMaster items={PROJECTS} label='Projects' />
          </Splitter.Panel>
          <Splitter.ResizeTrigger aria-label='Resize' />
          <Splitter.Panel position='end'>
            <NestedDetail />
          </Splitter.Panel>
        </Splitter.Root>
      </ListboxModule.Root>
    </Host>
  );
};

const meta = {
  title: 'ui/react-ui-core/exemplars/MasterDetail',
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

export const Tabs: Story = {
  render: TabsStory,
};

/** A draggable seam between list and detail. */
export const Resizable: Story = {
  args: { resizable: true },
};

/** No seam: the list pane holds `size`. */
export const Fixed: Story = {
  args: { resizable: false, size: 20 },
};

/** Narrow from the start: one pane at a time. */
export const Narrow: Story = {
  args: { width: 24 },
};

export const Nested: Story = {
  render: NestedStory,
  args: { width: 60, size: 14, collapseBelow: '36rem' },
};

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
