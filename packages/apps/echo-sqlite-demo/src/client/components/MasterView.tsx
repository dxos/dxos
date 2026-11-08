//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { Ref, Type } from '@dxos/echo';
import { useLabels } from '@dxos/echo-react';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as Select from '@dxos/react-ui/Select';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Organization, Person, getTypeIcon, getTypeTitle, types } from '../../schema.ts';
import { CodeView } from './CodeView.tsx';
import { GraphView } from './GraphView.tsx';
import { type Entry, ListView } from './ListView.tsx';
import { MasonryView } from './MasonryView.tsx';
import { SearchBar } from './SearchBar.tsx';
import { TableView } from './TableView.tsx';

export type MasterTab = 'list' | 'masonry' | 'table' | 'graph' | 'code';

const TABS: { value: MasterTab; label: string; icon: string }[] = [
  { value: 'list', label: 'List', icon: 'ph--list-bullets--regular' },
  { value: 'masonry', label: 'Masonry', icon: 'ph--kanban--regular' },
  { value: 'table', label: 'Table', icon: 'ph--table--regular' },
  { value: 'graph', label: 'Graph', icon: 'ph--graph--regular' },
  { value: 'code', label: 'Code', icon: 'ph--code--regular' },
];

/**
 * The master pane: its own toolbar — which type, which view, and the actions — over the records.
 *
 * A nested `Panel` gives the toolbar/body rows and the gutter the body's content inherits; every view owns its
 * scrolling (`Listbox.Viewport`, the code view) or fills instead (the graph).
 */
export const MasterView = ({
  typename,
  onTypenameChange,
  tab,
  onTabChange,
  organizations,
  people,
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
  organizations: readonly Organization[];
  people: readonly Person[];
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
  const objects = useMemo(() => [...organizations, ...people], [organizations, people]);
  const labels = useLabels(objects);

  // One record in the shape every view takes; the graph looks records up by id through the same map,
  // so a node's popover shows exactly the card the masonry does.
  const byId: ReadonlyMap<string, Entry> = useMemo(() => {
    const personEntry = (person: Person): Entry => {
      // Read the ref synchronously: both queries are loaded, so the target is resident.
      const employer = Ref.isRef(person.employer) ? person.employer.target : undefined;
      const employerLabel = employer && labels.get(employer);
      return {
        value: person.id,
        label: labels.get(person) ?? '',
        description: employerLabel ? `${person.email[0]} · ${employerLabel}` : person.email[0],
        icon: getTypeIcon(Person)?.icon,
        fields: [
          ...person.email.map((email) => ({ icon: 'ph--envelope-simple--regular', value: email })),
          ...(employerLabel ? [{ icon: getTypeIcon(Organization)!.icon, value: employerLabel }] : []),
        ],
      };
    };

    const organizationEntry = (org: Organization): Entry => ({
      value: org.id,
      label: labels.get(org) ?? '',
      icon: getTypeIcon(Organization)?.icon,
      fields: org.website ? [{ icon: 'ph--globe--regular', value: org.website }] : [],
    });

    return new Map([
      ...organizations.map((org) => [org.id, organizationEntry(org)] as const),
      ...people.map((person) => [person.id, personEntry(person)] as const),
    ]);
  }, [organizations, people, labels]);

  const entries: Entry[] = useMemo(
    () =>
      (typename === Type.getTypename(Person) ? people : organizations).flatMap((object) => {
        const entry = byId.get(object.id);
        return entry ? [entry] : [];
      }),
    [typename, organizations, people, byId],
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

  return (
    <Panel.Root classNames={classNames}>
      <Panel.Header asChild>
        <Toolbar.Root>
          <Select.Root items={typeItems} value={[typename]} onValueChange={({ value }) => onTypenameChange(value[0])}>
            <Select.Trigger classNames='shrink-0' placeholder='Type' aria-label='Type' fixed />
            <Select.Content>
              {typeItems.map((item) => (
                <Select.Item key={item.value} item={item} />
              ))}
            </Select.Content>
          </Select.Root>

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

          <SearchBar classNames='grow min-w-0' text={search} onTextChange={setSearch} suggestions={suggestions} />

          <Button.Root icon='ph--plus--regular' label='New' iconOnly onClick={onNew} />
          <Button.Root icon='ph--sparkle--regular' label='Generate' iconOnly variant='ghost' onClick={onGenerate} />
          <Button.Root icon='ph--link--regular' label='Copy link' iconOnly variant='ghost' onClick={onCopyLink} />
        </Toolbar.Root>
      </Panel.Header>

      <Panel.Body>
        {tab === 'list' && <ListView entries={matches} selected={selected} onSelect={onSelect} onRemove={onRemove} />}
        {tab === 'masonry' && (
          <MasonryView entries={matches} selected={selected} onSelect={onSelect} onRemove={onRemove} />
        )}
        {tab === 'table' && (
          <TableView
            type={typename === Type.getTypename(Person) ? Person : Organization}
            rows={(typename === Type.getTypename(Person) ? people : organizations).filter((object) =>
              keys.has(object.id),
            )}
            onSelect={onSelect}
          />
        )}
        {tab === 'graph' && (
          <GraphView
            organizations={organizations}
            people={people}
            getEntry={(id) => byId.get(id)}
            onSelect={onSelect}
          />
        )}
        {tab === 'code' && <CodeView />}
      </Panel.Body>
    </Panel.Root>
  );
};
