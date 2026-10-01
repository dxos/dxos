//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { Next, composable, composableProps } from '@dxos/react-ui';
import { type SearchResult } from '@dxos/react-ui-search';

import { Mosaic, type MosaicTileProps, useMosaicContainer } from '../../index.ts';

export type SearchStackAction = {
  type: 'select';
  resultId: string;
};

export type SearchStackActionHandler = (action: SearchStackAction) => void;

//
// SearchStack
//

export type SearchStackProps = {
  id: string;
  results?: SearchResult[];
  currentId?: string;
  onAction?: SearchStackActionHandler;
};

/**
 * Card-based search result stack component using mosaic layout.
 */
export const SearchStack = composable<HTMLDivElement, SearchStackProps>(
  ({ results = [], currentId, onAction, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    const items = useMemo(() => results.map((result) => ({ result, onAction })), [results, onAction]);

    const handleCurrentChange = useCallback(
      (id: string | undefined) => {
        if (id) {
          onAction?.({ type: 'select', resultId: id });
        }
      },
      [onAction],
    );

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.click();
      }
    }, []);

    return (
      <Next.Focus.Group asChild {...composableProps(props)} onKeyDown={handleKeyDown} ref={forwardedRef}>
        <Mosaic.Container asChild withFocus currentId={currentId} onCurrentChange={handleCurrentChange}>
          <Next.ScrollArea.Root orientation='vertical'>
            <Next.ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={SearchTile}
                gap={8}
                items={items}
                draggable={false}
                getId={(item) => item.result.id}
                getScrollElement={() => viewport}
                estimateSize={() => 100}
              />
            </Next.ScrollArea.Viewport>
          </Next.ScrollArea.Root>
        </Mosaic.Container>
      </Next.Focus.Group>
    );
  },
);

SearchStack.displayName = 'SearchStack';

//
// SearchTile
//

type SearchTileData = {
  result: SearchResult;
  onAction?: SearchStackActionHandler;
};

type SearchTileProps = Pick<MosaicTileProps<SearchTileData>, 'location' | 'data' | 'current'>;

/**
 * Default search result tile with a simple Card header.
 */
const SearchTile = forwardRef<HTMLDivElement, SearchTileProps>(({ data, location, current }, forwardedRef) => {
  const { result } = data;
  const { setCurrentId } = useMosaicContainer('SearchTile');

  const handleCurrentChange = useCallback(() => {
    setCurrentId(result.id);
  }, [result.id, setCurrentId]);

  // Navigation / current pattern: clicking a result navigates to its
  // detail. `dx-current` pairs with the `aria-current` attribute that
  // `Mosaic.Tile` now sets from the `current` prop. `dx-selected`
  // (master/detail option pattern) would be the wrong grammar here.
  // See `ui-theme/src/css/components/selected.md`.
  return (
    <Mosaic.Tile
      asChild
      classNames='dx-hover dx-current'
      id={result.id}
      data={data}
      location={location}
      current={current}
    >
      <Next.Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Next.Card.Root ref={forwardedRef}>
          <Next.Card.Header>
            <Next.Block />
            <Next.Card.Title>{result.label}</Next.Card.Title>
          </Next.Card.Header>
          {result.snippet && (
            <Next.Card.Body>
              <Next.Card.Row>
                <Next.Card.Text variant='description'>{result.snippet}</Next.Card.Text>
              </Next.Card.Row>
            </Next.Card.Body>
          )}
        </Next.Card.Root>
      </Next.Focus.Item>
    </Mosaic.Tile>
  );
});

SearchTile.displayName = 'SearchTile';
