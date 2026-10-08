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

  const schemas = Hooks.useCapabilities(AppCapabilities.Schema);
  const filter = useMemo(() => {
    const collectionTypename = Type.getTypename(Collection.Collection);
    const types = Array.dedupeWith(
      schemas
        .flat()
        .filter(Type.isType)
        .filter((type) => TypeOptions.isUserType(type))
        .filter((type) => Type.getTypename(type) !== collectionTypename),
      (a, b) => Type.getURI(a) === Type.getURI(b),
    );
    return types.length > 0 ? Filter.or(...types.map((type) => Filter.type(type))) : undefined;
  }, [schemas]);

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
  const pending = recent.length === 0 ? Math.min(total?.count ?? 0, RECENT_LIMIT) : 0;
  const placeholders = useMemo(
    () => (pending > 0 ? Array.makeBy(pending, (index) => `placeholder-${index}`) : []),
    [pending],
  );
  if (recent.length === 0 && pending === 0) {
    return null;
  }

  return (
    <HomeSection.Root>
      <HomeSection.Header title={t('space-home.recent.heading')} onClose={onClose} />
      {pending > 0 ? (
        <Masonry.Root Tile={PlaceholderTile}>
          <Masonry.Content padding={false} scrollbars={false}>
            <Masonry.Viewport items={placeholders} getId={(id) => id} />
          </Masonry.Content>
        </Masonry.Root>
      ) : (
        <Masonry.Root Tile={RecentObjectTile}>
          <Masonry.Content padding={false} scrollbars={false}>
            <Masonry.Viewport items={recent} getId={(object) => object.id} />
          </Masonry.Content>
        </Masonry.Root>
      )}
    </HomeSection.Root>
  );
};

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
