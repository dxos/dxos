//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { type SearchResult } from '@dxos/react-ui-search';
import * as Card from '@dxos/react-ui/Card';
import * as Focus from '@dxos/react-ui/Focus';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Util from '@dxos/react-ui/Util';

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
export const SearchStack = Util.composable<HTMLDivElement, SearchStackProps>(
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
      <Focus.Group asChild {...Util.composableProps(props)} onKeyDown={handleKeyDown} ref={forwardedRef}>
        <Mosaic.Container asChild withFocus currentId={currentId} onCurrentChange={handleCurrentChange}>
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={SearchTile}
                gap={8}
                items={items}
                draggable={false}
                getId={(item) => item.result.id}
                getScrollElement={() => viewport}
                estimateSize={() => 100}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      </Focus.Group>
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
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Card.Root ref={forwardedRef}>
          <Card.Header>
            <Layout.Block />
            <Card.Title>{result.label}</Card.Title>
          </Card.Header>
          {result.snippet && (
            <Card.Body>
              <Card.Row>
                <Card.Text variant='muted'>{result.snippet}</Card.Text>
              </Card.Row>
            </Card.Body>
          )}
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

SearchTile.displayName = 'SearchTile';
