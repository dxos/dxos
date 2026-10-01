//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { ObjectsTree } from '@dxos/devtools';
import { Filter, Obj, Query } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { type EntityId } from '@dxos/keys';
import { ForceGraph } from '@dxos/plugin-explorer/components';
import { useGraphModel } from '@dxos/plugin-explorer/hooks';
import { type Space, useFlush, useQuery } from '@dxos/react-client/echo';
import { composable, composableProps } from '@dxos/react-ui';
import { type ChatEditorProps } from '@dxos/react-ui-chat';
import { type EditorController, QueryEditor } from '@dxos/react-ui-components';
import { Masonry } from '@dxos/react-ui-masonry';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { Next } from '@dxos/react-ui/next';
import { mx } from '@dxos/ui-theme';

type DatabaseView = 'graph' | 'object-tree' | 'cards';

const VIEW_OPTIONS: { value: DatabaseView; icon: string; label: string }[] = [
  {
    value: 'graph',
    icon: 'ph--graph--regular',
    label: 'Graph',
  },
  {
    value: 'object-tree',
    icon: 'ph--tree-structure--regular',
    label: 'Object tree',
  },
  {
    value: 'cards',
    icon: 'ph--squares-four--regular',
    label: 'Cards',
  },
];

export const DatabaseModule = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <DatabaseModuleContainer space={space} />;
};

const DatabaseModuleContainer = ({ space }: { space: Space }) => {
  const [filter, setFilter] = useState<Filter.Any>();
  const [view, setView] = useState<DatabaseView>('graph');
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);

  const model = useGraphModel(space.db, filter);
  useEffect(() => {
    model?.setFilter(filter ?? Filter.everything());
  }, [model, filter]);

  const parser = useMemo(() => new QueryBuilder(), []);
  const handleSubmit = useCallback<NonNullable<ChatEditorProps['onSubmit']>>(
    (text) => {
      const { filter: nextFilter } = parser.build(text);
      setFilter(nextFilter ?? Filter.everything());
      setOpen(!!nextFilter);
    },
    [parser],
  );

  const handleViewChange = useCallback((value: string) => {
    if (value === 'graph' || value === 'object-tree' || value === 'cards') {
      setView(value);
    }
  }, []);

  const [selectedObject] = useQuery(
    space.db,
    selectedId ? Query.select(Filter.id(selectedId)) : Query.select(Filter.nothing()),
  );

  return (
    <Next.Panel.Root classNames='relative h-full'>
      <Next.Panel.Header>
        <DatabaseSearchBar space={space} view={view} onSubmit={handleSubmit} onViewChange={handleViewChange} />
      </Next.Panel.Header>
      <Next.Panel.Body classNames='relative min-h-0'>
        {view === 'graph' && <ForceGraph classNames='min-h-[50vh]' model={model} />}

        {view === 'object-tree' && (
          <Next.ScrollArea.Root classNames='h-full'>
            <Next.ScrollArea.Viewport>
              <ObjectsTree db={space.db} onSelect={(entity) => setSelectedId(entity.id)} />
            </Next.ScrollArea.Viewport>
          </Next.ScrollArea.Root>
        )}

        {view === 'cards' && (
          <DatabaseCardsView
            space={space}
            filter={filter}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
          />
        )}

        {open ? (
          <div
            className={mx(
              'flex absolute left-2 right-2 bottom-2 h-[8rem]',
              'overflow-hidden dx-base-surface border border-subdued-separator opacity-80',
            )}
          >
            <JsonHighlighter classNames='text-sm' data={filter} />
          </div>
        ) : (
          (view === 'object-tree' || view === 'cards') &&
          selectedObject && (
            <div
              className={mx(
                'flex absolute left-2 right-2 bottom-2 h-[8rem]',
                'overflow-hidden dx-base-surface border border-subdued-separator opacity-80',
              )}
            >
              <JsonHighlighter classNames='text-sm' data={selectedObject} />
            </div>
          )
        )}

        <div className='absolute bottom-4 right-4 z-10'>
          <Next.Button
            variant='ghost'
            icon={open ? 'ph--x--regular' : 'ph--arrow-line-up--regular'}
            iconOnly
            label={open ? 'Close filter' : 'Show filter'}
            onClick={() => setOpen((open) => !open)}
          />
        </div>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

type DatabaseSearchBarProps = { space: Space } & {
  view: DatabaseView;
  onSubmit: NonNullable<ChatEditorProps['onSubmit']>;
  onViewChange: (value: string) => void;
};

const DatabaseSearchBar = composable<HTMLDivElement, DatabaseSearchBarProps>(
  ({ space, view, onSubmit, onViewChange, ...props }, forwardedRef) => {
    const { state: flushState, handleFlush } = useFlush(space);
    const editorRef = useRef<EditorController>(null);

    return (
      <Next.Toolbar.Root {...composableProps(props)} ref={forwardedRef}>
        <QueryEditor classNames='p-1 w-full' db={space.db} onChange={onSubmit} />
        <Next.Toolbar.ToggleGroup type='single' value={view} onValueChange={onViewChange}>
          {VIEW_OPTIONS.map(({ value, icon, label }) => (
            <Next.ToggleGroup.Item key={value} value={value} aria-label={label} title={label}>
              <Next.Icon icon={icon} size='md' />
            </Next.ToggleGroup.Item>
          ))}
        </Next.Toolbar.ToggleGroup>
        {/* <Toolbar.IconButton
        icon='ph--magnifying-glass--regular'
        iconOnly
        label='Search'
        onClick={() => onSubmit?.(editorRef.current?.view?.state.doc.toString() ?? '')}
      />
      <Toolbar.IconButton
        disabled={flushState === 'flushing'}
        icon={Match.value(flushState).pipe(
          Match.when('idle', () => 'ph--floppy-disk--regular'),
          Match.when('flushing', () => 'ph--spinner--regular'),
          Match.when('flushed', () => 'ph--check--regular'),
          Match.exhaustive,
        )}
        iconOnly
        label='Flush'
        onClick={handleFlush}
      /> */}
      </Next.Toolbar.Root>
    );
  },
);

DatabaseSearchBar.displayName = 'DatabaseSearchBar';

type DatabaseCardsViewProps = {
  space: Space;
  filter: Filter.Any | undefined;
  selectedId: EntityId | null;
  onSelect: (id: EntityId) => void;
};

const DatabaseCardsView = ({ space, filter, selectedId, onSelect }: DatabaseCardsViewProps) => {
  const objects = useQuery(space.db, Query.select(filter ?? Filter.everything()));

  const tileItems = useMemo(
    () =>
      objects.map((object) => ({
        object,
        current: object.id === selectedId,
        onSelect,
      })),
    [objects, selectedId, onSelect],
  );

  if (objects.length === 0) {
    return <div className='p-4 text-sm text-description text-center'>No objects match the query.</div>;
  }

  return (
    <Masonry.Root Tile={DatabaseCardTile}>
      <Masonry.Content classNames='p-trim-md'>
        <Masonry.Viewport getId={(data) => data.object.id} items={tileItems} />
      </Masonry.Content>
    </Masonry.Root>
  );
};

type DatabaseCardTileData = {
  object: Obj.Unknown;
  current: boolean;
  onSelect: (id: EntityId) => void;
};

const DatabaseCardTile = ({ data }: { data: DatabaseCardTileData | undefined; index: number }) => {
  if (!data?.object) {
    return null;
  }

  const { object, current, onSelect } = data;
  const label = Obj.getLabel(object) ?? Obj.getTypename(object) ?? object.id;
  const iconAnnotation = Obj.getIcon(object);

  return (
    <Next.Card.Root classNames={['cursor-pointer', current && 'ring-2 ring-focus']} onClick={() => onSelect(object.id)}>
      <Next.Card.Header>
        <Next.Block>
          <Next.Icon icon={iconAnnotation?.icon ?? 'ph--circle-dashed--regular'} tone='subdued' />
        </Next.Block>
        <Next.Card.Title truncate>{label}</Next.Card.Title>
      </Next.Card.Header>
    </Next.Card.Root>
  );
};
