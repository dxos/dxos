//
// Copyright 2025 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { composable, composableProps, useTranslation } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { Next } from '@dxos/react-ui/next';
import { osTranslations } from '@dxos/ui-theme';

import { Subscription } from '#types';

export type SubscriptionStackAction =
  | { type: 'current'; feedId: string }
  | { type: 'sync'; feedId: string }
  | { type: 'delete'; feedId: string };

export type SubscriptionStackActionHandler = (action: SubscriptionStackAction) => void;

//
// SubscriptionStack
//

export type SubscriptionStackProps = {
  id?: string;
  feeds?: Subscription.Subscription[];
  currentId?: string;
  onAction?: SubscriptionStackActionHandler;
};

export const SubscriptionStack = composable<HTMLDivElement, SubscriptionStackProps>(
  ({ feeds = [], currentId, onAction, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);

    // TODO(burdon): Either sort or make draggable.
    const items = useMemo(() => feeds.map((feed) => ({ feed, onAction })), [feeds, onAction]);

    const handleCurrentChange = useCallback(
      (id: string | undefined) => {
        if (id) {
          onAction?.({ type: 'current', feedId: id });
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
        <Mosaic.Container
          asChild
          withFocus
          autoScroll={viewport}
          currentId={currentId}
          onCurrentChange={handleCurrentChange}
        >
          <Next.ScrollArea.Root orientation='vertical'>
            <Next.ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={SubscriptionTile}
                gap={8}
                items={items}
                draggable={false}
                getId={(item) => item.feed.id}
                getScrollElement={() => viewport}
                estimateSize={() => 100}
              />
            </Next.ScrollArea.Viewport>
          </Next.ScrollArea.Root>
        </Mosaic.Container>
      </Focus.Group>
    );
  },
);

SubscriptionStack.displayName = 'SubscriptionStack';

//
// SubscriptionTile
//

const icons: Record<Subscription.FeedType, { icon: string; className?: string }> = {
  'standard-site': {
    icon: 'ph--article--regular',
    className: 'text-sky-500',
  },
  'rss': {
    icon: 'ph--rss--regular',
    className: 'text-green-500',
  },
  'bluesky': {
    icon: 'ph--butterfly--regular',
    className: 'text-blue-500',
  },
};

type SubscriptionTileData = {
  feed: Subscription.Subscription;
  onAction?: SubscriptionStackActionHandler;
};

type SubscriptionTileProps = Pick<MosaicTileProps<SubscriptionTileData>, 'data' | 'location' | 'current'>;

const SubscriptionTile = forwardRef<HTMLDivElement, SubscriptionTileProps>(
  ({ data, location, current }, forwardedRef) => {
    const { feed, onAction } = data;
    const { t } = useTranslation(osTranslations);
    const { setCurrentId } = useMosaicContainer('SubscriptionTile');
    const { icon, className: iconClassName } = icons[feed.type ?? 'rss'] || icons.rss;

    const handleCurrentChange = useCallback(() => {
      setCurrentId(feed.id);
    }, [feed.id, setCurrentId]);

    const menuItems = useMemo(
      () => [
        { label: 'Sync', onClick: () => onAction?.({ type: 'sync', feedId: feed.id }) },
        { label: 'Delete', onClick: () => onAction?.({ type: 'delete', feedId: feed.id }) },
      ],
      [feed.id, onAction],
    );

    return (
      <Mosaic.Tile asChild classNames='dx-hover dx-current' id={feed.id} data={data} location={location}>
        <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
          <Next.Card.Root ref={forwardedRef}>
            <Next.Card.Header>
              <Next.Block>
                <Next.Icon icon={icon} classNames={iconClassName} />
              </Next.Block>
              <Next.Card.Title>{feed.name ?? 'Untitled feed'}</Next.Card.Title>
              <Next.Card.Menu label={t('toolbar-menu.label')}>
                {menuItems.map((item) => (
                  <Next.Menu.Item
                    key={item.label}
                    item={{ value: item.label, label: item.label }}
                    onClick={item.onClick}
                  />
                ))}
              </Next.Card.Menu>
            </Next.Card.Header>
            <Next.Card.Body>
              {/* {feed.url && (
                <Card.Row>
                  <Card.Text classNames='truncate' variant='description'>
                    {feed.url}
                  </Card.Text>
                </Card.Row>
              )} */}
              {feed.description && (
                <Next.Card.Row>
                  <Next.Card.Text variant='description'>{feed.description}</Next.Card.Text>
                </Next.Card.Row>
              )}
            </Next.Card.Body>
          </Next.Card.Root>
        </Focus.Item>
      </Mosaic.Tile>
    );
  },
);

SubscriptionTile.displayName = 'SubscriptionTile';
