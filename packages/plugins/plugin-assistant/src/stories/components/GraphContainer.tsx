//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ResearchGraph } from '@dxos/assistant-testing';
import { Filter, Query } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { D3ForceGraph, useGraphModel } from '@dxos/plugin-explorer';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { type ChatEditorProps } from '@dxos/react-ui-chat';
import { type EditorController, QueryEditor } from '@dxos/react-ui-components';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { useFlush } from '../../hooks';

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
      // TODO(burdon): Get AST from filter?
      const filter = parser.build(text);
      if (filter) {
        setFilter(filter);
        setOpen(true);
      }
    },
    [space, parser],
  );

  return (
    <div className={mx('relative bs-full grid', open && 'grid-rows-[min-content_1fr]')}>
      <SearchBar space={space} onSubmit={handleSubmit} />
      <D3ForceGraph classNames='min-bs-[50vh]' model={model} />

      {/* TODO(burdon): Create component with context state for story. */}
      {(open && (
        <div className='absolute left-2 right-2 bottom-2 h-[8rem] flex overflow-hidden bg-baseSurface border border-subduedSeparator'>
          <SyntaxHighlighter language='json' classNames='text-sm'>
            {JSON.stringify({ filter }, null, 2)}
          </SyntaxHighlighter>
          <div className='absolute bottom-1 right-1'>
            <IconButton variant='ghost' icon='ph--x--regular' iconOnly label='Close' onClick={() => setOpen(false)} />
          </div>
        </div>
      )) || (
        <div className='absolute bottom-3 right-3'>
          <IconButton
            variant='ghost'
            icon='ph--arrow-line-up--regular'
            iconOnly
            label='Open'
            onClick={() => setOpen(true)}
          />
        </div>
      )}
    </div>
  );
};

export const SearchBar = ({ space, onSubmit }: ComponentProps & Pick<ChatEditorProps, 'onSubmit'>) => {
  const { state: flushState, handleFlush } = useFlush(space);
  const editorRef = useRef<EditorController>(null);

  return (
    <Toolbar.Root classNames='density-coarse border-b border-subduedSeparator'>
      <QueryEditor classNames='p-2 is-full border-b border-subduedSeparator' space={space} onChange={onSubmit} />
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
