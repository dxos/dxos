//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject } from '@dxos/react-client/echo';
import { useSelected } from '@dxos/react-ui-attention';
import { Masonry } from '@dxos/react-ui-masonry';

import { ResultDetail } from './ResultDetail';
import { ResultTile } from './ResultTile';
import { SearchForm } from './SearchForm';
import { type Result, type Search } from '../../types';

export type SearchArticleProps = {
  subject: Search.Search;
  attendableId?: string;
};

/**
 * 3-pane master/detail view for a {@link Search}.
 * - left: provider selection + criteria form + Run.
 * - center: masonry grid of result cards.
 * - right: detail pane for the selected result.
 */
export const SearchArticle = ({ subject, attendableId }: SearchArticleProps) => {
  const [search] = useObject(subject);

  const id = attendableId ?? Obj.getURI(search);
  const currentId = useSelected(id, 'single');

  // Kick off load for any Result refs that aren't yet resolved so `ref.target`
  // becomes populated reactively on the next render cycle.
  useEffect(() => {
    for (const ref of search.results) {
      if (!ref.target) {
        void ref.load().catch((err) => log.catch(err));
      }
    }
  }, [search.results]);

  // Resolve the result refs to live objects (skip unresolved refs).
  const results = useMemo<Result.Result[]>(() => {
    const resolved: Result.Result[] = [];
    for (const ref of search.results) {
      if (ref.target) {
        resolved.push(ref.target);
      }
    }
    return resolved;
  }, [search.results, search.results.length]);

  const tileItems = useMemo<TileData[]>(
    () =>
      results.map((result) => ({
        result,
        current: Obj.getURI(result) === currentId,
      })),
    [results, currentId],
  );

  const selectedResult = useMemo(
    () => results.find((result) => Obj.getURI(result) === currentId),
    [results, currentId],
  );

  return (
    <div className='grid grid-cols-[20rem_minmax(0,1fr)_24rem] h-full overflow-hidden'>
      <div className='border-ie border-separator overflow-hidden'>
        <SearchForm search={subject} />
      </div>
      <div className='overflow-hidden'>
        {results.length === 0 ? (
          <div className='flex items-center justify-center h-full text-subdued text-sm'>No results.</div>
        ) : (
          <Masonry.Root Tile={TileAdapter} minColumnWidth={20} maxColumnWidth={25}>
            <Masonry.Content thin centered padding>
              <Masonry.Viewport
                classNames='py-2'
                items={tileItems}
                getId={(data) => (data?.result ? Obj.getURI(data.result) : '')}
              />
            </Masonry.Content>
          </Masonry.Root>
        )}
      </div>
      <div className='border-is border-separator overflow-hidden'>
        <ResultDetail result={selectedResult} />
      </div>
    </div>
  );
};

type TileData = {
  result: Result.Result;
  current: boolean;
};

const TileAdapter = ({ data }: { data: TileData | undefined; index: number }) => {
  if (!data?.result) {
    return null;
  }

  return <ResultTile result={data.result} current={data.current} />;
};
