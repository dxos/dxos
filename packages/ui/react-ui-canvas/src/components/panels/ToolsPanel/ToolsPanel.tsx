//
// Copyright 2026 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import React, {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Popover from '@dxos/react-ui/Popover';
import { mx } from '@dxos/ui-theme';

import { type Capabilities, type LinkRegistry, type NodeRegistry, type Tool } from '../../../model/index.ts';
import {
  FLOATING_PANEL,
  type ToolEntry,
  type ToolGroup,
  TOOLS_GROUP,
  nodeDragData,
  sameTool,
  toolGroups,
} from '../../../utils/index.ts';
import { type PanelProps } from '../types.ts';

export type ToolRailProps<T> = PanelProps & {
  groups: readonly ToolGroup<T>[];
  tool: T;
  /** Whether two tools are the same, for the pressed state. */
  same: (left: T, right: T) => boolean;
  /**
   * Folds each collapsible group into one flyout button: `auto` (the default) does so only when the flat rail would not
   * fit the space below it, so a small set keeps every tool one click away.
   */
  collapse?: 'auto' | boolean;
  /** How a folded group lists its tools: one per row with its name (the default), or a grid of icons. */
  flyout?: 'list' | 'grid';
  /** What a tool's button carries when dragged onto the view (e.g. a node type to create where it drops). */
  dragData?: (tool: T) => Record<string, unknown> | undefined;
  /** The test id of a tool's button. */
  testId: (entry: ToolEntry<T>) => string;
  /** Controls a group ends with, by group name. */
  groupEnd?: Readonly<Record<string, ReactNode>>;
  onToolChange: (tool: T) => void;
};

export type ToolsPanelProps = PanelProps & {
  tool: Tool;
  nodes: NodeRegistry;
  links: LinkRegistry;
  capabilities: Capabilities;
  collapse?: ToolRailProps<Tool>['collapse'];
  flyout?: ToolRailProps<Tool>['flyout'];
  /** The view is only looked at (`readonly`); offered, the tools group ends with a toggle between looking at the scene and editing it. */
  onReadonlyChange?: (readonly: boolean) => void;
  onToolChange: (tool: Tool) => void;
};

/** The height the rail would take flat: each button, the gaps between them, and each group's padding and divider. */
const flatHeight = <T,>(groups: readonly ToolGroup<T>[], button: number): number =>
  groups.reduce((height, group) => height + (group.folded ? 1 : group.entries.length) * (button + 4) - 4 + 9, 0);

/**
 * Whether the rail folds its groups: always, never, or (`auto`) when the flat rail would overflow its parent, which the
 * host sizes to the room the rail may take; re-measured as that resizes.
 */
const useCollapsed = <T,>(
  ref: RefObject<HTMLDivElement | null>,
  groups: readonly ToolGroup<T>[],
  collapse: ToolRailProps<T>['collapse'],
) => {
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    const host = element?.parentElement;
    if (collapse !== 'auto' || !element || !host) {
      return;
    }
    const measure = () => {
      const button = element.querySelector('button')?.getBoundingClientRect().height ?? 32;
      setOverflows(flatHeight(groups, button) > host.clientHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [ref, groups, collapse]);
  return collapse === 'auto' ? overflows : collapse;
};

/**
 * A floating rail of tools in groups, for any kind of view: a click picks the tool, the active one shows pressed, and
 * a group folds into a flyout (showing its active or last-used tool) when the rail runs out of room.
 */
export const ToolRail = <T,>({
  classNames,
  groups,
  tool,
  same,
  collapse = 'auto',
  flyout = 'list',
  dragData,
  testId,
  groupEnd,
  onToolChange,
}: ToolRailProps<T>) => {
  const ref = useRef<HTMLDivElement>(null);
  const collapsed = useCollapsed(ref, groups, collapse);
  const button = { same, dragData, testId, onToolChange };
  return (
    <div
      ref={ref}
      // The host's frame spans the room the rail may take and lets the view below it take the pointer.
      className={mx('flex flex-col w-fit divide-y divide-separator pointer-events-auto', FLOATING_PANEL, classNames)}
      data-testid='palette'
      data-collapsed={collapsed || undefined}
    >
      {groups.map((group) =>
        group.folded || (collapsed && group.collapsible) ? (
          <Layout.Flex key={group.name} column classNames='p-1'>
            <ToolsFlyout group={group} tool={tool} layout={flyout} {...button} />
          </Layout.Flex>
        ) : (
          <div key={group.name} className='flex flex-col gap-1 p-1'>
            {group.entries.map((entry) => (
              <ToolButton key={entry.label} entry={entry} active={same(tool, entry.tool)} {...button} />
            ))}
            {groupEnd?.[group.name]}
          </div>
        ),
      )}
    </div>
  );
};

/**
 * The 2D canvas's tool palette: a click picks the tool; a node type can also be dragged onto the canvas, which creates
 * it where it drops (the canvas is a pragmatic-dnd drop target for `nodeDragData`). With many types the node groups
 * fold into flyouts (`collapse`).
 */
export const ToolsPanel = ({
  classNames,
  tool,
  nodes,
  links,
  capabilities,
  collapse,
  flyout,
  readonly = false,
  onReadonlyChange,
  onToolChange,
}: ToolsPanelProps) => {
  const groups = useMemo(() => toolGroups(nodes, links, capabilities), [nodes, links, capabilities]);
  // Read-only leaves only select and pan, so the toggle sits with them.
  const groupEnd = useMemo(
    () =>
      onReadonlyChange && {
        [TOOLS_GROUP]: <ReadonlyToggle readonly={readonly} onReadonlyChange={onReadonlyChange} />,
      },
    [readonly, onReadonlyChange],
  );
  return (
    <ToolRail
      classNames={classNames}
      groups={groups}
      tool={tool}
      same={sameTool}
      collapse={collapse}
      flyout={flyout}
      dragData={paletteDragData}
      testId={paletteTestId}
      groupEnd={groupEnd}
      onToolChange={onToolChange}
    />
  );
};

export type ReadonlyToggleProps = { readonly: boolean; onReadonlyChange: (readonly: boolean) => void };

/** The tool rail's lock: switches a view between looking at the scene and editing it. */
export const ReadonlyToggle = ({ readonly, onReadonlyChange }: ReadonlyToggleProps) => (
  <Button.Toggle
    variant='ghost'
    iconOnly
    icon={readonly ? 'ph--lock-simple--regular' : 'ph--lock-simple-open--regular'}
    label={readonly ? 'Read-only: click to edit' : 'Editing: click to make read-only'}
    pressed={readonly}
    data-testid='palette-readonly'
    onPressedChange={() => onReadonlyChange(!readonly)}
  />
);

const paletteDragData = (tool: Tool): Record<string, unknown> | undefined =>
  tool.kind === 'node' ? nodeDragData(tool.type) : undefined;

const paletteTestId = (entry: ToolEntry): string =>
  `palette-${entry.key ?? ('type' in entry.tool ? entry.tool.type : entry.tool.kind)}`;

/** How long the pointer rests on a folded group before its tools open. */
const HOVER_OPEN_MS = 500;
/** How long the tools stay open after the pointer leaves, so it can cross the gap between the rail and the grid. */
const HOVER_CLOSE_MS = 250;

/**
 * Opens after the pointer rests on the trigger, and closes once it has left both the trigger and the content. `hovered`
 * is how it opened, so the content can leave focus where it is.
 */
const useHoverOpen = (setOpen: (open: boolean, hovered?: boolean) => void) => {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return useMemo(
    () => ({
      enter: () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setOpen(true, true), HOVER_OPEN_MS);
      },
      keep: () => clearTimeout(timer.current),
      leave: () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_MS);
      },
    }),
    [setOpen],
  );
};

type ToolButtonOptions<T> = Pick<ToolRailProps<T>, 'same' | 'dragData' | 'testId' | 'onToolChange'>;

type ToolsFlyoutProps<T> = ToolButtonOptions<T> & {
  group: ToolGroup<T>;
  tool: T;
  layout: NonNullable<ToolRailProps<T>['flyout']>;
};

/**
 * A folded group: its active (else last-used, else first) tool as one button, picked with a click, and a corner
 * chevron (or a hover) opening the group's tools beside the rail, as a list or a grid (`layout`).
 */
const ToolsFlyout = <T,>({ group, tool, layout, same, dragData, testId, onToolChange }: ToolsFlyoutProps<T>) => {
  const button = { same, dragData, testId };
  const [open, setOpenState] = useState(false);
  // Opened by a hover, the list takes no focus (a pointer user would see a focus ring on the first row); opened from
  // the chevron (a click or the keyboard), it does, so arrows move through it.
  const [hovered, setHovered] = useState(false);
  const setOpen = useCallback((next: boolean, byHover = false) => {
    setHovered(next && byHover);
    setOpenState(next);
  }, []);
  const hover = useHoverOpen(setOpen);
  const [lastUsed, setLastUsed] = useState<ToolEntry<T>>(group.entries[0]);
  const active = group.entries.find((entry) => same(tool, entry.tool));
  // A tool picked from elsewhere (its key, the grid) becomes the group's face, so the rail shows what is in use.
  useEffect(() => {
    if (active) {
      setLastUsed(active);
    }
  }, [active]);
  const shown = active ?? lastUsed;
  return (
    <Popover.Root
      open={open}
      autoFocus={!hovered}
      onOpenChange={({ open }) => setOpen(open)}
      positioning={{ placement: 'right-start' }}
    >
      <Popover.Anchor asChild>
        <div
          className='relative'
          data-testid={`palette-group-${group.name}`}
          onPointerEnter={hover.enter}
          onPointerLeave={hover.leave}
        >
          {/* No tooltip: hovering opens the flyout, which names every tool, and a tooltip would sit over it. */}
          <ToolButton
            entry={shown}
            active={active !== undefined}
            tooltip={false}
            {...button}
            onToolChange={onToolChange}
          />
          <Popover.Trigger asChild>
            <button
              type='button'
              aria-label={`${group.name} tools`}
              className='absolute bottom-0 right-0 flex size-3 items-end justify-end text-fg-subtle hover:text-fg'
              data-testid={`palette-group-${group.name}-open`}
            >
              <Icon.Icon icon='ph--caret-right--fill' size='xs' />
            </button>
          </Popover.Trigger>
        </div>
      </Popover.Anchor>
      <Popover.Content onPointerEnter={hover.keep} onPointerLeave={hover.leave}>
        <div
          className={mx(
            layout === 'list'
              ? 'flex flex-col items-stretch gap-1 p-1'
              : 'grid grid-cols-[repeat(3,min-content)] gap-1 p-1',
          )}
          data-testid={`palette-group-${group.name}-tools`}
        >
          {group.entries.map((entry) => (
            <ToolButton
              key={entry.label}
              entry={entry}
              labelled={layout === 'list'}
              active={same(tool, entry.tool)}
              {...button}
              onToolChange={(next) => {
                onToolChange(next);
                setOpen(false);
              }}
            />
          ))}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};

const ToolButton = <T,>({
  entry,
  active,
  labelled,
  tooltip = true,
  dragData,
  testId,
  onToolChange,
}: Omit<ToolButtonOptions<T>, 'same'> & {
  entry: ToolEntry<T>;
  active: boolean;
  /** Shows the label as a tooltip on an icon-only button. */
  tooltip?: boolean;
  /** Shows the tool's name beside its icon (a flyout's list), rather than the icon alone. */
  labelled?: boolean;
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const data = dragData?.(entry.tool);
  useEffect(() => {
    if (!ref.current || data === undefined) {
      return;
    }
    return draggable({
      element: ref.current,
      getInitialData: () => data,
      // The view draws a ghost of what will land, so the browser's image of the icon is noise.
      onGenerateDragPreview: ({ nativeSetDragImage }) => disableNativeDragPreview({ nativeSetDragImage }),
    });
    // The data is rebuilt each render; what it carries changes only with the tool.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.tool, dragData]);
  return labelled ? (
    <Button.Toggle
      ref={ref}
      variant='ghost'
      icon={entry.icon}
      label={entry.label}
      classNames='w-full justify-start'
      pressed={active}
      data-testid={testId(entry)}
      onPressedChange={() => onToolChange(entry.tool)}
    />
  ) : (
    <Button.Toggle
      ref={ref}
      variant='ghost'
      iconOnly
      showTooltip={tooltip}
      icon={entry.icon}
      label={entry.key ? `${entry.label} (${entry.key})` : entry.label}
      pressed={active}
      data-testid={testId(entry)}
      onPressedChange={() => onToolChange(entry.tool)}
    />
  );
};
