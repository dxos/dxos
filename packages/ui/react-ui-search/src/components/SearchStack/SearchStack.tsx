//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { Card, ScrollArea } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { composable, composableProps } from '@dxos/ui-theme';

import { type SearchResult } from '../../types';

export type SearchStackAction = { type: 'select'; resultId: string };

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
      <Focus.Group asChild {...composableProps(props)} onKeyDown={handleKeyDown} ref={forwardedRef}>
        <Mosaic.Container asChild withFocus currentId={currentId} onCurrentChange={handleCurrentChange}>
          <ScrollArea.Root orientation='vertical' padding centered>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={SearchTile}
                classNames='my-2'
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

type SearchTileProps = Pick<MosaicTileProps<SearchTileData>, 'location' | 'data'> & { current?: boolean };

/**
 * Default search result tile with a simple Card header.
 */
const SearchTile = forwardRef<HTMLDivElement, SearchTileProps>(({ data, location, current }, forwardedRef) => {
  const { result } = data;
  const { setCurrentId } = useMosaicContainer('SearchTile');

  const handleCurrentChange = useCallback(() => {
    setCurrentId(result.id);
  }, [result.id, setCurrentId]);

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current' id={result.id} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Card.Root ref={forwardedRef}>
          <Card.Toolbar>
            <Card.Title>
              <span className='truncate'>{result.label ?? 'Untitled'}</span>
            </Card.Title>
          </Card.Toolbar>
          {result.snippet && (
            <Card.Content>
              <Card.Row>
                <Card.Text variant='description'>{result.snippet}</Card.Text>
              </Card.Row>
            </Card.Content>
          )}
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

SearchTile.displayName = 'SearchTile';
