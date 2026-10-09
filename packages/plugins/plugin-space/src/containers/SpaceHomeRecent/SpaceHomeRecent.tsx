//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import React, { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as HomeSection from '@dxos/app-toolkit/HomeSection';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import { Aggregate, Collection, Filter, Obj, Order, Query, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type Space } from '@dxos/react-client/echo';
import { Masonry } from '@dxos/react-ui-masonry';
import * as Card from '@dxos/react-ui/Card';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Status from '@dxos/react-ui/Status';
import * as Theme from '@dxos/react-ui/Theme';
import { getStyles } from '@dxos/ui-theme';

import { meta } from '#meta';

/** Number of recently-modified objects to surface as cards. */
const RECENT_LIMIT = 10;

type SpaceScopedProps = {
  space?: Space;
  onClose?: () => void;
};

/**
 * Recent-objects region for the Home article. Queries the most-recently-modified objects of
 * registered, non-hidden, non-relation, non-collection types and renders them as a Masonry of
 * tiles, with placeholders while they load. Renders nothing (no heading) when the space has no recent
 * objects — the starter-prompt contributor (plugin-assistant) fills the empty state instead.
 */
export const SpaceHomeRecent = ({ space, onClose }: SpaceScopedProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);

  const { recent, pending } = useRecentObjects(space);
  const items = useMemo<RecentItem[]>(
    () => (pending > 0 ? Array.makeBy(pending, (index) => `placeholder-${index}`) : recent),
    [pending, recent],
  );
  if (recent.length === 0 && pending === 0) {
    return null;
  }

  return (
    <HomeSection.Root>
      <HomeSection.Header title={t('space-home.recent.heading')} onClose={onClose} />
      {/* One instance across the swap from placeholders to objects, so the measured grid never remounts. */}
      <Masonry.Root Tile={RecentTile}>
        <Masonry.Content padding={false} scrollbars={false}>
          <Masonry.Viewport items={items} getId={getRecentItemId} cacheKey={space && `${space.id}/recent`} />
        </Masonry.Content>
      </Masonry.Root>
    </HomeSection.Root>
  );
};

/**
 * The space's most recently modified user objects, and while none has loaded yet, how many the index
 * says are coming (capped at {@link RECENT_LIMIT}).
 */
const useRecentObjects = (space?: Space): { recent: Obj.Unknown[]; pending: number } => {
  const schemas = Hooks.useCapabilities(AppCapabilities.Schema);
  const filter = useMemo(() => recentObjectsFilter(schemas.flat()), [schemas]);
  const query = useMemo(
    () =>
      Query.select(filter ?? Filter.everything())
        .orderBy(Order.updated('desc'))
        .limit(RECENT_LIMIT),
    [filter],
  );
  // Index-only, so it settles before the recent objects' documents load; it sizes the placeholders.
  const countQuery = useMemo(
    () => Query.select(filter ?? Filter.everything()).aggregate({ count: Aggregate.count() }),
    [filter],
  );

  const db = filter && space ? space.db : undefined;
  const recent = useQuery(db, query);
  const [total] = useQuery(db, countQuery);
  return { recent, pending: recent.length === 0 ? Math.min(total?.count ?? 0, RECENT_LIMIT) : 0 };
};

/** Matches registered user types other than collections, each once; undefined when there are none. */
const recentObjectsFilter = (schemas: readonly unknown[]) => {
  const collectionTypename = Type.getTypename(Collection.Collection);
  const types = Array.dedupeWith(
    schemas
      .filter(Type.isType)
      .filter((type) => TypeOptions.isUserType(type))
      .filter((type) => Type.getTypename(type) !== collectionTypename),
    (a, b) => Type.getURI(a) === Type.getURI(b),
  );
  return types.length > 0 ? Filter.or(...types.map((type) => Filter.type(type))) : undefined;
};

/** A recent object, or the id of a placeholder held while the objects load. */
type RecentItem = Obj.Unknown | string;

const getRecentItemId = (item: RecentItem): string => (typeof item === 'string' ? item : item.id);

const RecentTile = ({ data, index }: { data: RecentItem; index: number }) =>
  typeof data === 'string' ? <PlaceholderTile /> : <RecentObjectTile data={data} index={index} />;

RecentTile.displayName = 'RecentTile';

const PlaceholderTile = () => (
  <Card.Root>
    <Card.Header>
      <Layout.Block>
        <Status.Skeleton variant='circle' />
      </Layout.Block>
      <Card.Title>
        <Status.Skeleton variant='text' />
      </Card.Title>
    </Card.Header>
  </Card.Root>
);

PlaceholderTile.displayName = 'PlaceholderTile';

const RecentObjectTile = ({ data }: { data: Obj.Unknown; index: number }) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const typename = Obj.getTypename(data);
  const label = Theme.toLocalizedString(
    Obj.getLabel(data) ?? (typename ? ['object-name.placeholder', { ns: typename, defaultValue: 'New item' }] : ''),
    t,
  );
  const iconAnnotation = Obj.getIcon(data);
  const icon = iconAnnotation?.icon ?? 'ph--circle-dashed--regular';
  const iconStyles = iconAnnotation?.hue ? getStyles(iconAnnotation.hue) : undefined;

  const handleClick = useCallback(() => {
    void invokePromise(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(data)] });
  }, [invokePromise, data]);

  return (
    <Card.Root role='button' classNames='cursor-pointer' onClick={handleClick}>
      <Card.Header>
        <Layout.Block>
          <Icon.Icon icon={icon} classNames={iconStyles?.text} />
        </Layout.Block>
        <Card.Title>{label}</Card.Title>
      </Card.Header>
    </Card.Root>
  );
};

RecentObjectTile.displayName = 'RecentObjectTile';

SpaceHomeRecent.displayName = 'SpaceHomeRecent';
