//
// Copyright 2025 DXOS.org
//

import { Match } from 'effect';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Filter } from '@dxos/echo';
import { D3ForceGraph, useGraphModel } from '@dxos/plugin-explorer';
import { Toolbar } from '@dxos/react-ui';
import { ChatEditor, type ChatEditorController, type ChatEditorProps } from '@dxos/react-ui-chat';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { type Expression, QueryParser, createFilter } from '../../parser';
import { useFlush, useMatcherExtension } from '../hooks';

import { type ComponentProps } from './types';

export const GraphContainer = ({ space }: ComponentProps) => {
  const [ast, setAst] = useState<Expression | undefined>();
  const [filter, setFilter] = useState<Filter.Any>();

  const model = useGraphModel(space);
  useEffect(() => {
    model?.setFilter(filter ?? Filter.everything());
  }, [model, filter]);

  const handleSubmit = useCallback<NonNullable<ChatEditorProps['onSubmit']>>(
    (text) => {
      try {
        const parser = new QueryParser(text);
        const ast = parser.parse();
        setAst(ast);
        const filter = createFilter(ast);
        setFilter(filter);
      } catch {
        // TODO(mykola): Make hybrid search.
        const filter = Filter.text(text, { type: 'vector' });
        setFilter(filter);
      }
    },
    [space],
  );

  return (
    <div className='grid grid-rows-[min-content_1fr_30%] h-full'>
      <SearchBar space={space} onSubmit={handleSubmit} />
      <D3ForceGraph model={model} />

      {/* TODO(burdon): Create component with context state for story. */}
      <div className='flex overflow-hidden border-bs border-subduedSeparator'>
        <SyntaxHighlighter language='json' classNames='text-sm'>
          {JSON.stringify({ ast, filter }, null, 2)}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export const SearchBar = ({ space, onSubmit }: ComponentProps & Pick<ChatEditorProps, 'onSubmit'>) => {
  const { state: flushState, handleFlush } = useFlush(space);
  const extensions = useMatcherExtension(space);
  const editorRef = useRef<ChatEditorController>(null);

  return (
    <Toolbar.Root classNames='border-b border-subduedSeparator'>
      <ChatEditor
        ref={editorRef}
        autoFocus
        placeholder='Search'
        extensions={extensions}
        fireIfEmpty
        onSubmit={onSubmit}
      />
      <Toolbar.IconButton
        icon='ph--magnifying-glass--regular'
        iconOnly
        label='Search'
        onClick={() => onSubmit?.(editorRef.current?.getText() ?? '')}
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
