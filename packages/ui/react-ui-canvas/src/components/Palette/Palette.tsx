//
// Copyright 2026 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import React, { type RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Popover from '@dxos/react-ui/Popover';
import { mx } from '@dxos/ui-theme';

import { type LinkRegistry, type NodeRegistry } from '../../model/registry.ts';
import { type Capabilities, type Tool } from '../../model/types.ts';
import { nodeDragData } from '../../utils/dnd.ts';

type Entry = { tool: Tool; icon: string; label: string; key?: string };

const BASE: Entry[] = [
  { tool: { kind: 'select' }, icon: 'ph--cursor--regular', label: 'Select', key: 'V' },
  { tool: { kind: 'hand' }, icon: 'ph--hand--regular', label: 'Pan', key: 'H' },
];

/** A run of palette entries; a group of node types may fold into one flyout button when the rail runs out of room. */
export type PaletteGroup = { name: string; entries: Entry[]; collapsible: boolean };

/** Node types by their `group`, in registry order; types without one share the first, unnamed group. */
const nodeGroups = (nodes: NodeRegistry): PaletteGroup[] => {
  const groups = new Map<string, Entry[]>();
  for (const def of Object.values(nodes)) {
    const name = def.group ?? '';
    groups.set(name, [
      ...(groups.get(name) ?? []),
      { tool: { kind: 'node' as const, type: def.type }, icon: def.icon, label: def.name, key: def.key },
    ]);
  }
  return [...groups.entries()].map(([name, entries]) => ({ name, entries, collapsible: entries.length > 1 }));
};

/**
 * Palette groups: the fixed tools, then the node types by group, then a link per link type; a group the projection
 * cannot apply (`create`, `link`) is left out rather than offered and silently dropped. Only node groups fold.
 */
export const paletteGroups = (nodes: NodeRegistry, links: LinkRegistry, capabilities: Capabilities): PaletteGroup[] =>
  [
    { name: 'Tools', entries: BASE, collapsible: false },
    ...(capabilities.create ? nodeGroups(nodes) : []),
    {
      name: 'Links',
      entries: capabilities.link
        ? Object.values(links).map((def) => ({
            tool: { kind: 'link' as const, type: def.type },
            icon: def.icon,
            label: def.name,
            key: def.key,
          }))
        : [],
      collapsible: false,
    },
  ].filter((group) => group.entries.length > 0);

/** Palette entries by group, flat within each. */
export const paletteEntries = (nodes: NodeRegistry, links: LinkRegistry, capabilities: Capabilities): Entry[][] =>
  paletteGroups(nodes, links, capabilities).map((group) => group.entries);

export const sameTool = (left: Tool, right: Tool): boolean =>
  left.kind === right.kind && ('type' in left ? left.type === ('type' in right ? right.type : undefined) : true);

export const toolForKey = (
  nodes: NodeRegistry,
  links: LinkRegistry,
  capabilities: Capabilities,
  key: string,
): Tool | undefined =>
  paletteEntries(nodes, links, capabilities)
    .flat()
    .find((entry) => entry.key !== undefined && entry.key === key.toUpperCase())?.tool;

export type PaletteProps = {
  tool: Tool;
  nodes: NodeRegistry;
  links: LinkRegistry;
  capabilities: Capabilities;
  /**
   * Folds each group of node types into one flyout button: `auto` (the default) does so only when the flat rail would
   * not fit the space below it, so a small registry keeps every tool one click away.
   */
  collapse?: 'auto' | boolean;
  /** How a folded group lists its tools: one per row with its name (the default), or a grid of icons. */
  flyout?: 'list' | 'grid';
  onToolChange: (tool: Tool) => void;
};

/** The height the rail would take flat: each button, the gaps between them, and each group's padding and divider. */
const flatHeight = (groups: readonly PaletteGroup[], button: number): number =>
  groups.reduce((height, group) => height + group.entries.length * (button + 4) - 4 + 9, 0);

/**
 * Whether the rail folds its node groups: always, never, or (`auto`) when the flat rail would overflow its parent,
 * which the host sizes to the room the rail may take (`SceneView.Palette` spans from below the navigation to above
 * the bottom bars); re-measured as that resizes.
 */
const useCollapsed = (
  ref: RefObject<HTMLDivElement | null>,
  groups: readonly PaletteGroup[],
  collapse: PaletteProps['collapse'],
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
 * Tool palette: a click picks the tool; a node type can also be dragged onto the canvas, which creates
 * it where it drops (the canvas is a pragmatic-dnd drop target for `nodeDragData`). With many types the node
 * groups fold into flyouts (`collapse`), each showing its active or last-used tool.
 */
export const Palette = ({
  tool,
  nodes,
  links,
  capabilities,
  collapse = 'auto',
  flyout = 'list',
  onToolChange,
}: PaletteProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => paletteGroups(nodes, links, capabilities), [nodes, links, capabilities]);
  const collapsed = useCollapsed(ref, groups, collapse);
  return (
    <div
      ref={ref}
      // The host's frame spans the room the rail may take and lets the canvas below it take the pointer.
      className='flex flex-col w-fit rounded-sm bg-modal-surface border border-separator divide-y divide-separator pointer-events-auto'
      data-testid='palette'
      data-collapsed={collapsed || undefined}
    >
      {groups.map((group) =>
        collapsed && group.collapsible ? (
          <div key={group.name} className='flex flex-col p-1'>
            <PaletteFlyout group={group} tool={tool} layout={flyout} onToolChange={onToolChange} />
          </div>
        ) : (
          <div key={group.name} className='flex flex-col gap-1 p-1'>
            {group.entries.map((entry) => (
              <PaletteButton
                key={entry.label}
                entry={entry}
                active={sameTool(tool, entry.tool)}
                onToolChange={onToolChange}
              />
            ))}
          </div>
        ),
      )}
    </div>
  );
};

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

type PaletteFlyoutProps = {
  group: PaletteGroup;
  tool: Tool;
  layout: NonNullable<PaletteProps['flyout']>;
  onToolChange: (tool: Tool) => void;
};

/**
 * A folded group: its active (else last-used, else first) tool as one button, picked with a click, and a corner
 * chevron (or a hover) opening the group's tools beside the rail, as a list or a grid (`layout`).
 */
const PaletteFlyout = ({ group, tool, layout, onToolChange }: PaletteFlyoutProps) => {
  const [open, setOpenState] = useState(false);
  // Opened by a hover, the list takes no focus (a pointer user would see a focus ring on the first row); opened from
  // the chevron (a click or the keyboard), it does, so arrows move through it.
  const [hovered, setHovered] = useState(false);
  const setOpen = useCallback((next: boolean, byHover = false) => {
    setHovered(next && byHover);
    setOpenState(next);
  }, []);
  const hover = useHoverOpen(setOpen);
  const [lastUsed, setLastUsed] = useState<Entry>(group.entries[0]);
  const active = group.entries.find((entry) => sameTool(tool, entry.tool));
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
          <PaletteButton entry={shown} active={active !== undefined} onToolChange={onToolChange} />
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
            <PaletteButton
              key={entry.label}
              entry={entry}
              labelled={layout === 'list'}
              active={sameTool(tool, entry.tool)}
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

const PaletteButton = ({
  entry,
  active,
  labelled,
  onToolChange,
}: {
  entry: Entry;
  active: boolean;
  /** Shows the tool's name beside its icon (a flyout's list), rather than the icon alone. */
  labelled?: boolean;
  onToolChange: (tool: Tool) => void;
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const nodeType = entry.tool.kind === 'node' ? entry.tool.type : undefined;
  useEffect(() => {
    if (!ref.current || nodeType === undefined) {
      return;
    }
    return draggable({
      element: ref.current,
      getInitialData: () => nodeDragData(nodeType),
      // The canvas draws a ghost of the node that will land, so the browser's image of the icon is noise.
      onGenerateDragPreview: ({ nativeSetDragImage }) => disableNativeDragPreview({ nativeSetDragImage }),
    });
  }, [nodeType]);
  return (
    <Button.Root
      ref={ref}
      variant='ghost'
      iconOnly={!labelled}
      icon={entry.icon}
      label={labelled ? entry.label : entry.key ? `${entry.label} (${entry.key})` : entry.label}
      classNames={mx(labelled && 'w-full justify-start', active && 'bg-primary-500/20')}
      data-testid={`palette-${entry.key ?? ('type' in entry.tool ? entry.tool.type : entry.tool.kind)}`}
      onClick={() => onToolChange(entry.tool)}
    />
  );
};
