//
// Copyright 2020 DXOS.org
//

import { formatDistanceToNow } from 'date-fns';
import React, { type ComponentRef, useCallback, useMemo, useRef, useState } from 'react';

import { type Database, Entity, Filter, Format, Obj, Query, Tag, Type } from '@dxos/echo';
import { type VersionDiff, checkoutVersion, getEditHistoryWithDiffs } from '@dxos/echo-client';
import { QueryBuilder, matchesFilter } from '@dxos/echo-query';
import { type EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { QueryEditor } from '@dxos/react-ui-query';
import { DynamicTable, type TableFeatures } from '@dxos/react-ui-table';
import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { mx } from '@dxos/ui-theme';

import {
  BlobPreview,
  ObjectsGraph,
  ObjectsTree,
  Placeholder,
  PropertyTree,
  findBlobRef,
} from '../../../../components/index.ts';
import { DataSpaceSelector } from '../../../../containers/index.ts';
import { useDevtoolsState } from '../../../../hooks/index.ts';
import { type ArticleProps } from '../../types.ts';

type View = 'tree' | 'table' | 'graph';

const VIEWS: { value: View; icon: string; label: string }[] = [
  { value: 'tree', icon: 'ph--tree-view--regular', label: 'Tree' },
  { value: 'table', icon: 'ph--table--regular', label: 'Table' },
  { value: 'graph', icon: 'ph--graph--regular', label: 'Graph' },
];

const isView = (value: string): value is View => VIEWS.some((view) => view.value === value);

/**
 * Every entity in a space: a tree, table or graph on the left, filtered by the query DSL the mailbox and
 * task lists use; the selected entity's properties (with references expandable in place) and edit
 * history beside it; and, for a blob or an object holding one, its rendered content.
 */
export const ObjectsArticle = ({ role, ...props }: ArticleProps & { space?: Space }) => {
  const state = useDevtoolsState();
  const space = props.space ?? state.space;
  const db = space?.db;
  const items = useQuery(db, Query.select(Filter.everything()).options({ deleted: 'include' }));
  const tags = useTagMap(db);

  const [view, setView] = useState<View>('tree');
  const [text, setText] = useState('');
  // The editor reads `value` only on mount, so a clear has to be pushed into it.
  const editorRef = useRef<ComponentRef<typeof QueryEditor>>(null);
  const handleClear = useCallback(() => {
    editorRef.current?.setText('');
    setText('');
  }, []);
  const filter = useMemo(() => {
    const trimmed = text.trim();
    // A query that does not parse matches nothing, rather than everything.
    return trimmed.length > 0 ? (new QueryBuilder(tags).build(trimmed).filter ?? Filter.nothing()) : undefined;
  }, [text, tags]);

  // Evaluated in memory rather than by a query, so a match is also found by the tree, which keeps its own query.
  const matches = useMemo(
    () => (filter ? items.filter((item) => matchesFilter(filter, item)) : items),
    [items, filter],
  );
  const matchingIds = useMemo(
    () => (filter ? new Set<string>(matches.map((item) => item.id)) : undefined),
    [filter, matches],
  );
  const graphFilter = useMemo(
    () => (matchingIds ? Filter.id(...matches.map((item) => item.id)) : undefined),
    [matchingIds, matches],
  );

  const [selectedId, setSelectedId] = useState<string>();
  const selected = useMemo(() => items.find((item) => item.id === selectedId), [items, selectedId]);
  // The version is held here rather than in the inspector, so the blob preview shows the same version it does.
  const [version, setVersion] = useState<number>();
  const history = useEditHistory(selected);
  const displayed = useMemo(() => {
    const heads = version !== undefined ? history[version]?.heads : undefined;
    return heads && Obj.isObject(selected) ? checkoutVersion(selected, heads) : selected;
  }, [selected, history, version]);
  const blob = useMemo(() => (Obj.isObject(displayed) ? findBlobRef(displayed) : undefined), [displayed]);

  const handleSelect = useCallback((id: string | undefined) => {
    setSelectedId(id);
    setVersion(undefined);
  }, []);
  const handleViewChange = useCallback((value: string) => isView(value) && setView(value), []);

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <Toolbar.Root>
          {!props.space && <DataSpaceSelector />}
          <QueryEditor
            classNames='grow min-w-0 ps-1'
            db={db}
            tags={tags}
            value={text}
            onChange={setText}
            ref={editorRef}
            data-testid='objects.query'
          />
          <Button.Root
            icon='ph--x--regular'
            iconOnly
            disabled={text.trim().length === 0}
            label='Clear query'
            onClick={handleClear}
          />
          <Toolbar.ToggleGroup type='single' value={view} onValueChange={handleViewChange}>
            {VIEWS.map(({ value, icon, label }) => (
              <ToggleGroup.Item key={value} value={value} icon={icon} iconOnly label={label} />
            ))}
          </Toolbar.ToggleGroup>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <div
          className={mx(
            'h-full grid overflow-hidden divide-x divide-separator',
            blob ? 'grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,3fr)]' : 'grid-cols-[minmax(0,2fr)_minmax(0,3fr)]',
          )}
        >
          <div className='flex flex-col overflow-hidden'>
            {db && (
              <ObjectsView
                view={view}
                db={db}
                items={matches}
                ids={matchingIds}
                filter={graphFilter}
                selected={selectedId}
                onSelect={handleSelect}
              />
            )}
          </div>
          {selected && db ? (
            <Inspector
              entity={selected}
              value={displayed}
              db={db}
              history={history}
              version={version}
              onVersionChange={setVersion}
              onSelect={handleSelect}
            />
          ) : (
            <Placeholder label='Select an object' />
          )}
          {blob && db && (
            <div className='overflow-hidden' data-testid='objects.blob'>
              <BlobPreview source={blob} db={db} />
            </div>
          )}
        </div>
      </Panel.Body>
      <Panel.Footer>
        <div className='flex justify-end px-2 text-sm text-fg-muted'>
          {filter ? `${matches.length} of ${items.length} entities` : `${items.length} entities`}
        </div>
      </Panel.Footer>
    </Panel.Root>
  );
};

//
// Views
//

type ObjectsViewProps = {
  view: View;
  db: Database.Database;
  items: Entity.Unknown[];
  ids?: ReadonlySet<string>;
  filter?: Filter.Any;
  selected?: string;
  onSelect: (id: string | undefined) => void;
};

const ObjectsView = ({ view, db, items, ids, filter, selected, onSelect }: ObjectsViewProps) => {
  switch (view) {
    case 'tree':
      return (
        <ScrollArea.Root>
          <ScrollArea.Viewport>
            <ObjectsTree db={db} ids={ids} selected={selected} onSelect={(entity) => onSelect(entity.id)} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      );
    case 'table':
      return <ObjectsTable items={items} onSelect={onSelect} />;
    case 'graph':
      return <ObjectsGraph db={db} filter={filter} selected={selected} onSelect={(object) => onSelect(object.id)} />;
  }
};

const TABLE_PROPERTIES = [
  { name: 'type', format: Format.TypeFormat.String },
  { name: 'label', format: Format.TypeFormat.String },
  { name: 'version', format: Format.TypeFormat.String, size: 80 },
  {
    name: 'deleted',
    format: Format.TypeFormat.SingleSelect,
    size: 100,
    config: { options: [{ id: 'DELETED', title: 'DELETED', color: 'red' }] },
  },
  { name: 'id', format: Format.TypeFormat.DID },
];

const TABLE_FEATURES: Partial<TableFeatures> = { selection: { enabled: true, mode: 'single' } };

const ObjectsTable = ({ items, onSelect }: { items: Entity.Unknown[]; onSelect: (id: string | undefined) => void }) => {
  const rows = useMemo(
    () =>
      items.map((item) => {
        const type = Obj.isObject(item) ? Obj.getType(item) : undefined;
        return {
          id: item.id,
          label: Entity.getLabel(item) ?? '',
          type: Entity.getTypename(item),
          version: type ? Type.getVersion(type) : undefined,
          deleted: Entity.isDeleted(item) ? 'DELETED' : ' ',
        };
      }),
    [items],
  );

  return (
    <DynamicTable
      properties={TABLE_PROPERTIES}
      rows={rows}
      features={TABLE_FEATURES}
      onRowClick={(row: { id?: string } | undefined) => onSelect(row?.id)}
    />
  );
};

//
// Inspector
//

type InspectorProps = {
  entity: Entity.Unknown;
  /** The entity as shown: live, or checked out at `version`. */
  value: unknown;
  db: Database.Database;
  history: VersionDiff[];
  version?: number;
  onVersionChange: (version: number | undefined) => void;
  onSelect: (id: EntityId) => void;
};

/** The selected entity's header, its properties (at the live or a past version), and its edit history. */
const Inspector = ({ entity, value, db, history, version, onVersionChange, onSelect }: InspectorProps) => {
  const uri = Entity.getURI(entity).toString();
  const icon = Entity.getIcon(entity);
  const deleted = Entity.isDeleted(entity);

  return (
    <div className='grid grid-rows-[min-content_minmax(0,1fr)_minmax(0,12rem)] overflow-hidden'>
      <div className='flex flex-col gap-1 p-2 border-b border-separator'>
        <div className='flex items-center gap-2 min-w-0'>
          <Icon.Icon icon={icon?.icon ?? 'ph--cube--regular'} size='md' />
          <span className={mx('truncate grow', deleted && 'line-through opacity-60')}>
            {Entity.getLabel(entity) ?? Entity.getTypename(entity) ?? entity.id}
          </span>
          <SystemButton.Clipboard iconOnly label='Copy URI' value={uri} />
          <SystemButton.Clipboard
            iconOnly
            icon='ph--brackets-curly--regular'
            label='Copy JSON'
            onCopy={() => JSON.stringify(value, null, 2)}
          />
        </div>
        <div className='font-mono text-xs text-fg-subtle truncate' title={uri}>
          {Entity.getTypename(entity)} · {entity.id}
        </div>
        {version !== undefined && (
          <div className='flex items-center gap-2 text-xs text-amber-text'>
            <span className='grow'>
              Viewing version {version + 1} of {history.length}
            </span>
            <Button.Root
              label='Back to live'
              icon='ph--arrow-counter-clockwise--regular'
              onClick={() => onVersionChange(undefined)}
            />
          </div>
        )}
      </div>
      <ScrollArea.Root>
        <ScrollArea.Viewport>
          <PropertyTree value={value} db={db} onNavigate={onSelect} />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
      <History history={history} version={version} onVersionChange={onVersionChange} />
    </div>
  );
};

const useEditHistory = (entity: Entity.Unknown | undefined): VersionDiff[] =>
  useMemo(() => {
    if (!Obj.isObject(entity)) {
      return [];
    }
    try {
      return getEditHistoryWithDiffs(entity);
    } catch (err) {
      // An object not yet persisted has no document to read history from.
      log.catch(err);
      return [];
    }
  }, [entity]);

type HistoryProps = {
  history: VersionDiff[];
  version?: number;
  onVersionChange: (version: number | undefined) => void;
};

/** Newest first; selecting a row checks the properties out at that version. */
const History = ({ history, version, onVersionChange }: HistoryProps) => (
  <div className='flex flex-col overflow-hidden border-t border-separator'>
    <div className='px-2 py-1 text-xs text-fg-subtle border-b border-separator'>History ({history.length})</div>
    <ScrollArea.Root>
      <ScrollArea.Viewport>
        <ul className='text-sm' data-testid='objects.history'>
          {history
            .map((entry, index) => ({ entry, index }))
            .reverse()
            .map(({ entry, index }) => (
              <li key={index}>
                <button
                  className={mx(
                    'grid grid-cols-[2.5rem_minmax(0,1fr)_6rem_5rem] gap-2 w-full px-2 py-0.5 text-start hover:bg-hover-surface',
                    version === index && 'bg-current-surface',
                  )}
                  onClick={() => onVersionChange(version === index || index === history.length - 1 ? undefined : index)}
                >
                  <span className='text-fg-subtle'>#{index + 1}</span>
                  <span className='truncate'>{formatDistanceToNow(entry.time, { addSuffix: true })}</span>
                  <span className='font-mono text-xs text-fg-subtle truncate' title={entry.actor}>
                    {entry.actor.slice(0, 8)}
                  </span>
                  <span className='font-mono text-xs text-end'>
                    <span className='text-green-text'>+{entry.added}</span>{' '}
                    <span className='text-red-text'>−{entry.removed}</span>
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  </div>
);

/** Tag registry keyed by the `Tag` object's uri — the id space `#tag` terms and `meta.tags` share. */
const useTagMap = (db: Database.Database | undefined): Tag.Map => {
  const tags = useQuery(db, Filter.type(Tag.Tag));
  return useMemo(
    () =>
      tags.reduce<Tag.Map>((acc, tag) => {
        acc[Obj.getURI(tag).toString()] = tag;
        return acc;
      }, {}),
    [tags],
  );
};
