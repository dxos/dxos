//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Entity, Obj, Ref, Type } from '@dxos/echo';
import { useLabels } from '@dxos/echo-react';
import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Menu from '@dxos/react-ui/Menu';
import * as Panel from '@dxos/react-ui/Panel';
import * as Select from '@dxos/react-ui/Select';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { getTypeIcon, getTypeTitle, types } from '../../schema.ts';
import { GraphView } from './GraphView.tsx';
import { type Entry, ListView } from './ListView.tsx';
import { MasonryView } from './MasonryView.tsx';
import { SearchBar } from './SearchBar.tsx';
import { TableView } from './TableView.tsx';

export type MasterTab = 'list' | 'masonry' | 'table' | 'graph';

const TABS: { value: MasterTab; label: string; icon: string }[] = [
  { value: 'list', label: 'List', icon: 'ph--list-bullets--regular' },
  { value: 'masonry', label: 'Masonry', icon: 'ph--kanban--regular' },
  { value: 'table', label: 'Table', icon: 'ph--table--regular' },
  { value: 'graph', label: 'Graph', icon: 'ph--graph--regular' },
];

/** The actions that do not earn a button of their own. */
const MENU_ITEMS = [
  { value: 'generate', label: 'Generate records', icon: 'ph--sparkle--regular' },
  { value: 'copy-link', label: 'Copy link', icon: 'ph--link--regular' },
];

const typeOf = (obj: Obj.Unknown): Type.AnyObj | undefined => {
  const typename = Obj.getTypename(obj);
  return types.find((type) => Type.getTypename(type) === typename);
};

const iconOf = (obj: Obj.Unknown): string | undefined => {
  const type = typeOf(obj);
  return type && getTypeIcon(type)?.icon;
};

/**
 * The master pane: its own toolbar — which type, which view, and the actions — with search under it, over the records.
 *
 * A nested `Panel` gives the header/body rows and the gutter the body's content inherits; every view owns its
 * scrolling (`Listbox.Viewport`) or fills instead (the graph).
 */
export const MasterView = ({
  typename,
  onTypenameChange,
  tab,
  onTabChange,
  objects,
  selected,
  onSelect,
  onRemove,
  onNew,
  onGenerate,
  onCopyLink,
  classNames,
}: {
  typename: string;
  onTypenameChange: (typename: string) => void;
  tab: MasterTab;
  onTabChange: (tab: MasterTab) => void;
  /** Every record of every type; the chosen type is a filter over them. */
  objects: readonly Obj.Unknown[];
  selected?: string;
  onSelect?: (id?: string) => void;
  onRemove?: (id: string) => void;
  onNew?: () => void;
  onGenerate?: () => void;
  onCopyLink?: () => void;
  classNames?: string;
}) => {
  const typeItems = useMemo(
    () =>
      types.map((type) => ({
        value: Type.getTypename(type)!,
        label: getTypeTitle(type),
        icon: getTypeIcon(type)?.icon,
      })),
    [],
  );

  // `useQuery` hands out one live object per id, so an edit leaves the array as it was; subscribing to
  // each label is what re-renders a renamed row.
  const labels = useLabels(objects);

  // One record in the shape every view takes, read off the object rather than per type: the label property is the
  // title and every other field is a row, so a new type in `schema.ts` shows up here with no code. The graph looks
  // records up by id through the same map, so a node's popover shows exactly the card the masonry does.
  const byId: ReadonlyMap<string, Entry> = useMemo(() => {
    const describe = (obj: Obj.Unknown): Entry => {
      const labelProperty = Entity.labelProperty(obj);
      const fields: { icon?: string; value: string }[] = [];
      for (const [property, value] of Object.entries(obj)) {
        if (property === 'id' || property === labelProperty || value === undefined) {
          continue;
        }
        // A list contributes one row per element, so two addresses read as two rows rather than one joined line.
        for (const item of Array.isArray(value) ? value : [value]) {
          if (Ref.isRef(item)) {
            // Read the ref synchronously: every type is queried, so the target is resident.
            const target = item.target;
            if (target) {
              fields.push({ icon: iconOf(target), value: labels.get(target) ?? '' });
            }
          } else if (item !== undefined && item !== null) {
            fields.push({ value: String(item) });
          }
        }
      }
      return {
        value: obj.id,
        label: labels.get(obj) ?? '',
        description: fields[0]?.value,
        icon: iconOf(obj),
        fields,
      };
    };

    return new Map(objects.map((obj) => [obj.id, describe(obj)] as const));
  }, [objects, labels]);

  /** The objects of the chosen type, which is what every view but the graph shows. */
  const ofType = useMemo(() => objects.filter((obj) => Obj.getTypename(obj) === typename), [objects, typename]);

  const entries: Entry[] = useMemo(
    () => ofType.flatMap((obj) => (byId.has(obj.id) ? [byId.get(obj.id)!] : [])),
    [ofType, byId],
  );

  const [search, setSearch] = useState('');
  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length === 0) {
      return entries;
    }
    return entries.filter((entry) =>
      [entry.label, entry.description, ...(entry.fields?.map((field) => field.value) ?? [])]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [entries, search]);

  /** The labels of what the query returns, so a completion is always something the data can answer. */
  const suggestions = useMemo(() => matches.map((entry) => entry.label), [matches]);
  const keys = useMemo(() => new Set(matches.map((entry) => entry.value)), [matches]);

  /** What the table shows: the objects behind the matches, as one array per render of the inputs. */
  const rows = useMemo(() => ofType.filter((obj) => keys.has(obj.id)), [ofType, keys]);

  const type = useMemo(() => types.find((type) => Type.getTypename(type) === typename) ?? types[0], [typename]);

  /** Stable per record set: the graph bakes it into its renderer, which a new function would rebuild every render. */
  const getEntry = useCallback((id: string) => byId.get(id), [byId]);

  return (
    <Panel.Root classNames={classNames}>
      {/* Two rows: the controls, and the search under them. A Panel header is a column, so they stack. */}
      <Panel.Header>
        <Toolbar.Root>
          <Select.Root items={typeItems} value={[typename]} onValueChange={({ value }) => onTypenameChange(value[0])}>
            <Select.Trigger classNames='shrink-0' placeholder='Type' aria-label='Type' fixed />
            <Select.Content>
              {typeItems.map((item) => (
                <Select.Item key={item.value} item={item} />
              ))}
            </Select.Content>
          </Select.Root>

          <Button.Root icon='ph--plus--regular' label='New' iconOnly onClick={onNew} />

          {/* The views sit at the end, with the actions that do not fit in the menu beyond them. */}
          <Toolbar.Separator variant='gap' />

          <ToggleGroup.Root
            type='single'
            value={tab}
            onValueChange={(value) => value && onTabChange(value as MasterTab)}
            rovingFocus={false}
          >
            {TABS.map(({ value, label, icon }) => (
              <ToggleGroup.Item key={value} value={value} icon={icon} label={label} iconOnly variant='ghost' />
            ))}
          </ToggleGroup.Root>

          <Menu.Root onSelect={({ value }) => (value === 'generate' ? onGenerate?.() : onCopyLink?.())}>
            <Menu.Trigger asChild>
              <Button.Root icon='ph--dots-three-vertical--regular' label='More' iconOnly variant='ghost' />
            </Menu.Trigger>
            <Menu.Content>
              {MENU_ITEMS.map((item) => (
                <Menu.Item key={item.value} item={item} />
              ))}
            </Menu.Content>
          </Menu.Root>
        </Toolbar.Root>

        <Toolbar.Root>
          {/* The editor sits in an Input's own well, so the search reads as a control rather than loose text. */}
          <Input.Frame classNames='grow min-w-0' end={<Icon.Icon icon='ph--magnifying-glass--regular' />}>
            <SearchBar classNames='grow min-w-0' text={search} onTextChange={setSearch} suggestions={suggestions} />
          </Input.Frame>
        </Toolbar.Root>
      </Panel.Header>

      <Panel.Body>
        {tab === 'list' && <ListView entries={matches} selected={selected} onSelect={onSelect} onRemove={onRemove} />}
        {tab === 'masonry' && (
          <MasonryView entries={matches} selected={selected} onSelect={onSelect} onRemove={onRemove} />
        )}
        {tab === 'table' && <TableView type={type} rows={rows} onSelect={onSelect} />}
        {tab === 'graph' && <GraphView objects={objects} selected={selected} getEntry={getEntry} onSelect={onSelect} />}
      </Panel.Body>
    </Panel.Root>
  );
};
