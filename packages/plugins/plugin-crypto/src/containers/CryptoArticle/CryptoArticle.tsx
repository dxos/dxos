//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { Card, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';

import { Crypto } from '#types';

const COINGECKO_API_BASE = '/api/coingecko';

export type CryptoArticleProps = {
  role: string;
  subject: Crypto.CryptoWatchlist;
  attendableId?: string;
};

/** Format a number as currency. */
const formatUsd = (value: number | undefined): string => {
  if (value === undefined) {
    return 'N/A';
  }
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
};

//
// Tile component.
//

type TokenTileData = {
  metric: Crypto.TokenMetric;
};

type TokenTileProps = Pick<MosaicTileProps<TokenTileData>, 'data' | 'location' | 'current'>;

const TokenTile = forwardRef<HTMLDivElement, TokenTileProps>(({ data, location, current }, forwardedRef) => {
  const { metric } = data;
  const { setCurrentId } = useMosaicContainer('TokenTile');
  const priceChangeColor = (metric.priceChange24h ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500';

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current' id={metric.coingeckoId} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={() => setCurrentId(metric.coingeckoId)}>
        <Card.Root ref={forwardedRef}>
          <Card.Toolbar>
            <Card.IconBlock>
              <Card.Icon icon='ph--coins--regular' />
            </Card.IconBlock>
            <Card.Text classNames='truncate'>{metric.symbol?.toUpperCase()} — {metric.name}</Card.Text>
          </Card.Toolbar>
          <Card.Content>
            <Card.Row icon='ph--currency-dollar--regular'>
              <Card.Text variant='description'>
                {formatUsd(metric.price)}
                <span className={`ml-2 ${priceChangeColor}`}>
                  {(metric.priceChange24h ?? 0) >= 0 ? '+' : ''}{(metric.priceChange24h ?? 0).toFixed(2)}%
                </span>
              </Card.Text>
            </Card.Row>
            <Card.Row icon='ph--chart-bar--regular'>
              <Card.Text variant='description'>MCap: {formatUsd(metric.marketCap)} · Vol: {formatUsd(metric.volume24h)}</Card.Text>
            </Card.Row>
            {metric.recordedAt && (
              <Card.Row icon='ph--clock--regular'>
                <Card.Text variant='description'>{new Date(metric.recordedAt).toLocaleString()}</Card.Text>
              </Card.Row>
            )}
          </Card.Content>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

TokenTile.displayName = 'TokenTile';

//
// Main article component.
//

export const CryptoArticle = ({ role, subject: watchlist }: CryptoArticleProps) => {
  const db = Obj.getDatabase(watchlist);
  const metrics: Crypto.TokenMetric[] = useQuery(db, Filter.type(Crypto.TokenMetric));
  const [syncing, setSyncing] = useState(false);
  const [tokenViewport, setTokenViewport] = useState<HTMLElement | null>(null);

  const handleSync = useCallback(async () => {
    if (!db || !watchlist.tokenIds) {
      return;
    }

    setSyncing(true);
    try {
      const tokenIds = watchlist.tokenIds.split(',').map((id) => id.trim()).filter(Boolean);
      if (tokenIds.length === 0) {
        return;
      }

      const idsParam = tokenIds.join(',');
      const response = await fetch(
        `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&ids=${idsParam}&order=market_cap_desc&sparkline=false&price_change_percentage=24h,7d`,
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API ${response.status}: ${await response.text()}`);
      }

      const tokens = await response.json();
      const existingById = new Map(metrics.map((metric) => [metric.coingeckoId, metric]));

      for (const token of tokens) {
        const existing = existingById.get(token.id);

        if (existing) {
          Obj.change(existing, (mutable) => {
            mutable.name = token.name;
            mutable.symbol = token.symbol;
            mutable.price = token.current_price;
            mutable.marketCap = token.market_cap;
            mutable.volume24h = token.total_volume;
            mutable.priceChange24h = token.price_change_percentage_24h;
            mutable.priceChange7d = token.price_change_percentage_7d_in_currency;
            mutable.image = token.image;
            mutable.recordedAt = new Date().toISOString();
          });
        } else {
          const metric = Crypto.makeMetric({
            symbol: token.symbol,
            coingeckoId: token.id,
            name: token.name,
            price: token.current_price,
            marketCap: token.market_cap,
            volume24h: token.total_volume,
            priceChange24h: token.price_change_percentage_24h,
            priceChange7d: token.price_change_percentage_7d_in_currency,
            image: token.image,
            recordedAt: new Date().toISOString(),
          });
          db.add(metric);
        }
      }

      Obj.change(watchlist, (mutable) => {
        mutable.lastSyncedAt = new Date().toISOString();
      });
    } catch (error) {
      log.catch(error);
    } finally {
      setSyncing(false);
    }
  }, [db, watchlist, metrics]);

  // Auto-sync on first load.
  const didAutoSync = useRef(false);
  useEffect(() => {
    if (!didAutoSync.current && watchlist.tokenIds && !watchlist.lastSyncedAt) {
      didAutoSync.current = true;
      void handleSync();
    }
  }, [watchlist.tokenIds, watchlist.lastSyncedAt, handleSync]);

  const sortedMetrics = useMemo(
    () => [...metrics].sort((metricA, metricB) => (metricB.marketCap ?? 0) - (metricA.marketCap ?? 0)),
    [metrics],
  );

  const tokenItems = useMemo(
    () => sortedMetrics.map((metric) => ({ metric })),
    [sortedMetrics],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{watchlist.name ?? 'Token Watchlist'}</Toolbar.Text>
          <Toolbar.Separator />
          <Toolbar.IconButton
            label={syncing ? 'Syncing...' : 'Refresh prices'}
            icon='ph--arrows-clockwise--regular'
            iconOnly
            disabled={syncing || !watchlist.tokenIds}
            onClick={handleSync}
          />
          {watchlist.lastSyncedAt && (
            <>
              <Toolbar.Separator />
              <Toolbar.Text>
                {new Date(watchlist.lastSyncedAt).toLocaleTimeString()}
              </Toolbar.Text>
            </>
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Focus.Group asChild>
          <Mosaic.Container asChild withFocus autoScroll={tokenViewport}>
            <ScrollArea.Root orientation='vertical' padding centered>
              <ScrollArea.Viewport ref={setTokenViewport}>
                <Mosaic.VirtualStack
                  Tile={TokenTile}
                  classNames='my-2'
                  gap={8}
                  items={tokenItems}
                  draggable={false}
                  getId={(item) => item.metric.coingeckoId}
                  getScrollElement={() => tokenViewport}
                  estimateSize={() => 120}
                />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        </Focus.Group>
      </Panel.Content>
      {!watchlist.tokenIds && (
        <Panel.Statusbar>
          <p className='flex p-1 items-center text-warning-text'>Add CoinGecko token IDs in properties to start tracking.</p>
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};
