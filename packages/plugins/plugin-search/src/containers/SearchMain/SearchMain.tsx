//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Entity, Query } from '@dxos/echo';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { Card, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { Menu } from '@dxos/react-ui-menu';
import { Mosaic, type MosaicStackTileComponent } from '@dxos/react-ui-mosaic';
import { Text } from '@dxos/schema';

import { SearchPanel } from '@dxos/react-ui-search';
import { useGlobalSearch, useGlobalSearchResults, useWebSearch } from '../../hooks';
import { meta } from '../../meta';
import { type SearchResult } from '../../types';

export const SearchMain = ({ space }: { space?: Space }) => {
  const { t } = useTranslation(meta.id);
  const { setMatch } = useGlobalSearch();
  const [query, setQuery] = useState<string>();
  // TODO(burdon): Option to search across spaces.
  const objects = useQuery(
    space?.db,
    query === undefined
      ? Query.select(Filter.nothing())
      : // TODO(dmaretskyi): Final version would walk the ancestry of the object until we find a non-system type.
        Query.all(
          Query.select(Filter.text(query, { type: 'full-text' })).select(Filter.not(Filter.type(Text.Text))),
          Query.select(Filter.text(query, { type: 'full-text' }))
            .select(Filter.type(Text.Text))
            .referencedBy('org.dxos.type.document', 'content'),
        ),
  );

  const results = useGlobalSearchResults(objects);
  const { results: webResults } = useWebSearch({ query });
  const allResults = useMemo(
    () => [...results, ...webResults].filter(({ object }) => object && Entity.getLabel(object)),
    [results, webResults],
  );

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
      setMatch?.(text);
    },
    [setMatch],
  );

  return (
    <SearchPanel onSearch={handleSearch}>
      <Mosaic.Container asChild>
        <ScrollArea.Root margin padding thin>
          <ScrollArea.Viewport>
            <Mosaic.Stack
              classNames='gap-1'
              draggable={false}
              items={allResults}
              getId={(result) => result.object!.id}
              Tile={SearchResultTile}
            />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Mosaic.Container>
    </SearchPanel>
  );
};

const SearchResultTile: MosaicStackTileComponent<SearchResult> = (props) => {
  const data = props.data;
  const object = data.object!;
  const objectMenuItems = useObjectMenuItems(object);

  return (
    <Menu.Root>
      <Card.Root key={data.id} fullWidth role='button' classNames='cursor-pointer'>
        <Card.Toolbar>
          <Card.DragHandle />
          <Card.Title>{data.label ?? (data.object && Entity.getLabel(data.object))}</Card.Title>
          {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
          <Menu.Trigger asChild disabled={!objectMenuItems?.length}>
            <Toolbar.IconButton iconOnly variant='ghost' icon='ph--dots-three-vertical--regular' label='Actions' />
          </Menu.Trigger>
          <Menu.Content items={objectMenuItems} />
        </Card.Toolbar>
        <Surface.Surface role='card--content' data={{ subject: data.object }} limit={1} />
      </Card.Root>
    </Menu.Root>
  );
};
