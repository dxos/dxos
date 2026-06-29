//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Filter, Query } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { useFlush } from '@dxos/plugin-assistant/hooks';
import { ForceGraph } from '@dxos/plugin-explorer/components';
import { useGraphModel } from '@dxos/plugin-explorer/hooks';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton, Panel, Toolbar, composable, composableProps } from '@dxos/react-ui';
import { type ChatEditorProps } from '@dxos/react-ui-chat';
import { type EditorController, QueryEditor } from '@dxos/react-ui-components';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

import { ResearchInputQueue } from '../testing';
import { type ModuleProps } from './types';

export const GraphModule = ({ space }: ModuleProps) => {
  const [filter, setFilter] = useState<Filter.Any>();
  const [open, setOpen] = useState(false);

  const [researchInput] = useQuery(space.db, Filter.type(ResearchInputQueue));
  const feed = researchInput?.feed.target;
  const items = useQuery(
    space.db,
    feed ? Query.select(Filter.everything()).from(feed) : Query.select(Filter.nothing()),
  );

  const model = useGraphModel(space.db, undefined, undefined, items);
  useEffect(() => {
    model?.setFilter(filter ?? Filter.everything());
  }, [model, filter]);

  const parser = useMemo(() => new QueryBuilder(), []);
  const handleSubmit = useCallback<NonNullable<ChatEditorProps['onSubmit']>>(
    (text) => {
      const { filter } = parser.build(text);
      setFilter(filter ?? Filter.everything());
      setOpen(!!filter);
    },
    [space, parser],
  );

  return (
    <Panel.Root classNames='relative h-full'>
      <Panel.Toolbar asChild>
        <SearchBar space={space} onSubmit={handleSubmit} />
      </Panel.Toolbar>
      <Panel.Content classNames='relative min-h-0'>
        <ForceGraph classNames='min-h-[50vh]' model={model} />

        {open && (
          <div
            className={mx(
              'flex absolute left-2 right-2 bottom-2 h-[8rem]',
              'overflow-hidden bg-base-surface border border-subdued-separator opacity-80',
            )}
          >
            <JsonHighlighter classNames='text-sm' data={filter} />
          </div>
        )}

        <div className='absolute bottom-4 right-4 z-10'>
          <IconButton
            variant='ghost'
            icon={open ? 'ph--x--regular' : 'ph--arrow-line-up--regular'}
            iconOnly
            label={open ? 'Close' : 'Open'}
            onClick={() => setOpen((open) => !open)}
          />
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

type SearchBarProps = ModuleProps & Pick<ChatEditorProps, 'onSubmit'>;

export const SearchBar = composable<HTMLDivElement, SearchBarProps>(({ space, onSubmit, ...props }, forwardedRef) => {
  const { state: flushState, handleFlush } = useFlush(space);
  const editorRef = useRef<EditorController>(null);

  return (
    <Toolbar.Root {...composableProps(props)} ref={forwardedRef}>
      <QueryEditor classNames='p-1 w-full' db={space.db} onChange={onSubmit} />
      <Toolbar.IconButton
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
        label='flush'
        onClick={handleFlush}
      />
    </Toolbar.Root>
  );
});

SearchBar.displayName = 'SearchBar';
