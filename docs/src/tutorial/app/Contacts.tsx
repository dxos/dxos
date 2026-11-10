//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Obj, Type } from '@dxos/echo';
import { useLabels } from '@dxos/echo-react';
import { type Space, useQuery } from '@dxos/react-client/echo';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';
import * as Select from '@dxos/react-ui/Select';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { events, organizations, people, search } from '../queries.ts';
import { Event, Organization, Person, getTypeIcon } from '../schema.ts';
import { RecordForm } from './RecordForm.tsx';
import { RecordGraph } from './RecordGraph.tsx';
import { type Entry, RecordList } from './RecordList.tsx';
import { RecordTable } from './RecordTable.tsx';

/**
 * How far the learning path has built the app: `types` shows each type's records, `queries` adds search and a
 * table, `records` adds creating, editing and removing, and `complete` adds the graph.
 */
export type Stage = 'types' | 'queries' | 'records' | 'complete';

const STAGES: readonly Stage[] = ['types', 'queries', 'records', 'complete'];
const reached = (stage: Stage, at: Stage) => STAGES.indexOf(stage) >= STAGES.indexOf(at);

export const isStage = (value: unknown): value is Stage => STAGES.some((stage) => stage === value);

const TYPES = [
  { type: Organization, label: 'Organizations' },
  { type: Person, label: 'People' },
  { type: Event, label: 'Events' },
] as const;

type View = 'list' | 'table' | 'graph';

const VIEWS: readonly { value: View; label: string; icon: string }[] = [
  { value: 'list', label: 'List', icon: 'ph--list-bullets--regular' },
  { value: 'table', label: 'Table', icon: 'ph--table--regular' },
  { value: 'graph', label: 'Graph', icon: 'ph--graph--regular' },
];

/** The stage at which each view appears. */
const VIEW_STAGES: Record<View, Stage> = { list: 'types', table: 'queries', graph: 'complete' };

export type ContactsProps = {
  space: Space;
  stage: Stage;
  /** Leaves out search and the view switch, for a peer that shares the embed with another. */
  compact?: boolean;
};

/** The tutorial app: one space's organizations, people and events. */
export const Contacts = ({ space, stage, compact }: ContactsProps) => {
  const [typename, setTypename] = useState(Type.getTypename(Person));
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<string>();
  const [text, setText] = useState('');

  // #region query
  const allOrganizations = useQuery(space.db, organizations);
  const allPeople = useQuery(space.db, people);
  const allEvents = useQuery(space.db, events);
  // #endregion

  const records: Obj.Unknown[] = useMemo(
    () => [...allOrganizations, ...allPeople, ...allEvents],
    [allOrganizations, allPeople, allEvents],
  );
  const type = TYPES.find((entry) => Type.getTypename(entry.type) === typename)?.type ?? Person;
  const searchable = reached(stage, 'queries') && !compact;
  const searching = searchable && text.trim().length > 0;
  // Searches only while there is text to search for: an empty search has nothing to match.
  const found = useQuery(searching ? space.db : undefined, search(text.trim()));
  const shown = useMemo(
    () =>
      searching
        ? found.filter((record) => records.includes(record))
        : records.filter((record) => Obj.getTypename(record) === typename),
    [searching, found, records, typename],
  );

  // `useQuery` keeps one live object per id, so a rename leaves its array as it was; `useLabels` re-renders it.
  const labels = useLabels(shown);
  const entries: Entry[] = useMemo(
    () =>
      shown.map((record) => {
        const recordType = TYPES.find((entry) => Type.getTypename(entry.type) === Obj.getTypename(record))?.type;
        return {
          value: record.id,
          label: labels.get(record) ?? '',
          icon: recordType && getTypeIcon(recordType)?.icon,
        };
      }),
    [shown, labels],
  );

  const subject = useMemo(() => records.find((record) => record.id === selected), [records, selected]);
  const handleRemove = useCallback(
    (id: string) => {
      const record = records.find((record) => record.id === id);
      if (record) {
        space.db.remove(record);
        setSelected((current) => (current === id ? undefined : current));
      }
    },
    [space, records],
  );
  const handleCreate = useCallback((record: Obj.Unknown) => setSelected(record.id), []);

  const typeItems = TYPES.map(({ type, label }) => ({
    value: Type.getTypename(type),
    label,
    icon: getTypeIcon(type)?.icon,
  }));
  const views = compact ? [] : VIEWS.filter(({ value }) => reached(stage, VIEW_STAGES[value]));

  return (
    // A narrow peer, as on Sharing or a phone, puts the form under the list.
    <div className='@container h-full min-h-0'>
      <div className='grid grid-rows-[auto_minmax(0,1fr)_auto] @md:grid-cols-[3fr_2fr] @md:grid-rows-[auto_1fr] h-full min-h-0'>
        <div className='@md:col-span-2 border-b border-separator'>
          <Toolbar.Root>
            <Select.Root
              items={typeItems}
              value={[typename]}
              onValueChange={({ value }) => {
                setTypename(value[0]);
                setSelected(undefined);
              }}
            >
              <Select.Trigger aria-label='Type' classNames='w-auto' />
              <Select.Content>
                {typeItems.map((item) => (
                  <Select.Item key={item.value} item={item} />
                ))}
              </Select.Content>
            </Select.Root>
            {reached(stage, 'records') && (
              <Button.Root icon='ph--plus--regular' label='New' iconOnly onClick={() => setSelected(undefined)} />
            )}
            {searchable && (
              <Input.Root
                classNames='min-w-24'
                noAutoFill
                placeholder='Search'
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            )}
            <Toolbar.Separator variant='gap' />
            {views.length > 1 && (
              <ToggleGroup.Root
                type='single'
                value={view}
                onValueChange={(value) =>
                  setView((current) => views.find((view) => view.value === value)?.value ?? current)
                }
                rovingFocus={false}
              >
                {views.map(({ value, label, icon }) => (
                  <ToggleGroup.Item key={value} value={value} icon={icon} label={label} iconOnly variant='ghost' />
                ))}
              </ToggleGroup.Root>
            )}
          </Toolbar.Root>
        </div>

        <div className='flex flex-col min-h-0 border-b @md:border-b-0 @md:border-e border-separator'>
          {view === 'list' && (
            <RecordList
              entries={entries}
              selected={selected}
              onSelect={setSelected}
              onRemove={reached(stage, 'records') ? handleRemove : undefined}
            />
          )}
          {view === 'table' && <RecordTable type={type} records={shown} onSelect={setSelected} />}
          {view === 'graph' && <RecordGraph records={records} selected={selected} onSelect={setSelected} />}
        </div>

        <div className='overflow-y-auto'>
          <RecordForm
            db={space.db}
            type={type}
            record={subject}
            editable={reached(stage, 'records')}
            onCreate={handleCreate}
          />
        </div>
      </div>
    </div>
  );
};
