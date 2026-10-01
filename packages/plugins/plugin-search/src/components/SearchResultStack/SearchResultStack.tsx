//
// Copyright 2023 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useCardPivot, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Entity } from '@dxos/echo';
import { Next, composable, composableProps } from '@dxos/react-ui';
import { ActionMenu } from '@dxos/react-ui-menu';
import { Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { Highlighted, type SearchResult } from '@dxos/react-ui-search';

//
// SearchResultStack
//

export type SearchResultStackProps = {
  results: SearchResult[];
  query: string;
};

export const SearchResultStack = composable<HTMLDivElement, SearchResultStackProps>(
  ({ results, query, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    const items = useMemo(() => results.map((result) => ({ result, query })), [results, query]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.click();
      }
    }, []);

    return (
      <Next.Focus.Group asChild {...composableProps(props)} onKeyDown={handleKeyDown} ref={forwardedRef}>
        <Mosaic.Container asChild>
          <Next.ScrollArea.Root orientation='vertical'>
            <Next.ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={SearchResultTile}
                gap={8}
                items={items}
                draggable={false}
                getId={(item) => item.result.id}
                getScrollElement={() => viewport}
                estimateSize={() => 150}
              />
            </Next.ScrollArea.Viewport>
          </Next.ScrollArea.Root>
        </Mosaic.Container>
      </Next.Focus.Group>
    );
  },
);

SearchResultStack.displayName = 'SearchResultStack';

//
// SearchResultTile
//

type SearchResultTileData = {
  result: SearchResult;
  query: string;
};

type SearchResultTileProps = Pick<MosaicTileProps<SearchResultTileData>, 'location' | 'data' | 'current'>;

/**
 * Search result tile that uses Surface to render object content.
 */
const SearchResultTile = forwardRef<HTMLDivElement, SearchResultTileProps>(
  ({ data, location, current }, forwardedRef) => {
    const { result, query } = data;
    const label = result.label ?? (result.object && Entity.getLabel(result.object)) ?? '';
    // Card.Root already takes the forwarded ref; walk from the header to resolve the origin plank.
    const [cardRef, pivotId] = useCardPivot();
    const menuItems = useObjectMenuItems(result.object, pivotId);
    const { setCurrentId } = useMosaicContainer('SearchResultTile');

    const handleCurrentChange = useCallback(() => {
      setCurrentId(result.id);
    }, [result.id, setCurrentId]);

    return (
      <Mosaic.Tile asChild classNames='dx-hover dx-current dx-selected' id={result.id} data={data} location={location}>
        <Next.Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
          <Next.Card.Root ref={forwardedRef} role='button' classNames='cursor-pointer'>
            <Next.Card.Header ref={cardRef}>
              <Next.Block />
              <Next.Card.Title>
                <Highlighted text={label} query={query} />
              </Next.Card.Title>
              <Next.Block rail='end'>
                <ActionMenu disabled={!menuItems?.length} actions={menuItems}>
                  <Next.Button iconOnly variant='ghost' icon='ph--dots-three-vertical--regular' label='Actions' />
                </ActionMenu>
              </Next.Block>
            </Next.Card.Header>
            <Surface.Surface type={AppSurface.CardContent} data={{ subject: result.object }} limit={1} />
          </Next.Card.Root>
        </Next.Focus.Item>
      </Mosaic.Tile>
    );
  },
);

SearchResultTile.displayName = 'SearchResultTile';
