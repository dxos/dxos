//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ResearchGraph } from '@dxos/assistant-toolkit';
import { Filter, Query } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { useFlush } from '@dxos/plugin-assistant';
import { D3ForceGraph, useGraphModel } from '@dxos/plugin-explorer';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { type ChatEditorProps } from '@dxos/react-ui-chat';
import { type EditorController, QueryEditor } from '@dxos/react-ui-components';
import { StackItem } from '@dxos/react-ui-stack';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { type ComponentProps } from './types';

export const GraphContainer = ({ space }: ComponentProps) => {
  const [filter, setFilter] = useState<Filter.Any>();
  const [open, setOpen] = useState(false);

  const [researchGraph] = useQuery(space, Query.type(ResearchGraph));
  const queue = researchGraph?.queue.target;

  // TODO(burdon): Clean-up API.
  const model = useGraphModel(space, undefined, undefined, queue);
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
    <StackItem.Content toolbar classNames={['relative bs-full grid', open && 'grid-rows-[min-content_1fr]']}>
      <SearchBar space={space} onSubmit={handleSubmit} />
      <D3ForceGraph classNames='min-bs-[50vh]' model={model} />

      {open && (
        <div
          role='none'
          className={mx(
            'flex absolute left-2 right-2 bottom-2 bs-[8rem]',
            'overflow-hidden bg-baseSurface border border-subduedSeparator opacity-80',
          )}
        >
          <Json classNames='text-sm' data={filter} />
        </div>
      )}

      <div role='none' className='absolute bottom-4 right-4 z-10'>
        <IconButton
          variant='ghost'
          icon={open ? 'ph--x--regular' : 'ph--arrow-line-up--regular'}
          iconOnly
          label={open ? 'Close' : 'Open'}
          onClick={() => setOpen((open) => !open)}
        />
      </div>
    </StackItem.Content>
  );
};

export const SearchBar = ({ space, onSubmit }: ComponentProps & Pick<ChatEditorProps, 'onSubmit'>) => {
  const { state: flushState, handleFlush } = useFlush(space);
  const editorRef = useRef<EditorController>(null);

  return (
    <Toolbar.Root>
      <QueryEditor classNames='p-1 is-full' db={space.db} onChange={onSubmit} />
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
};
