//
// Copyright 2023 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, ObjectCard, useCardPivot, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Entity } from '@dxos/echo';
import { Block, Button, Focus, ScrollArea, composable, composableProps } from '@dxos/react-ui';
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
      <Focus.Group asChild {...composableProps(props)} onKeyDown={handleKeyDown} ref={forwardedRef}>
        <Mosaic.Container asChild>
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={SearchResultTile}
                gap={8}
                items={items}
                draggable={false}
                getId={(item) => item.result.id}
                getScrollElement={() => viewport}
                estimateSize={() => 150}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      </Focus.Group>
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
        <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
          <ObjectCard.Root ref={forwardedRef} role='button' classNames='cursor-pointer'>
            <ObjectCard.Header
              ref={cardRef}
              subject={result.object}
              menu={
                <Block rail='end'>
                  <ActionMenu disabled={!menuItems?.length} actions={menuItems}>
                    <Button iconOnly variant='ghost' icon='ph--dots-three-vertical--regular' label='Actions' />
                  </ActionMenu>
                </Block>
              }
            >
              <Highlighted text={label} query={query} />
            </ObjectCard.Header>
            <Surface.Surface type={AppSurface.CardContent} data={{ subject: result.object }} limit={1} />
          </ObjectCard.Root>
        </Focus.Item>
      </Mosaic.Tile>
    );
  },
);

SearchResultTile.displayName = 'SearchResultTile';
