//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useMemo } from 'react';

import { HomeSection, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation, Paths } from '@dxos/app-toolkit';
import { Collection, Filter, Obj, Order, Query, Type } from '@dxos/echo';
import { HiddenAnnotation, getTypeAnnotation } from '@dxos/echo/Annotation';
import { Kind as EntityKind } from '@dxos/echo/Entity';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Card, Icon, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
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
 * tiles. Renders nothing (no heading) when the space has no recent objects — the starter-prompt
 * contributor (plugin-assistant) fills the empty state instead.
 */
export const SpaceHomeRecent = ({ space, onClose }: SpaceScopedProps) => {
  const { t } = useTranslation(meta.profile.key);

  const schemas = useCapabilities(AppCapabilities.Schema);
  const filter = useMemo(() => {
    const collectionTypename = Type.getTypename(Collection.Collection);
    const types = schemas
      .flat()
      .filter(Type.isType)
      .filter((type) => getTypeAnnotation(Type.getSchema(type))?.kind !== EntityKind.Relation)
      .filter((type) => !HiddenAnnotation.get(Type.getSchema(type)).pipe(Option.getOrElse(() => false)))
      .filter((type) => Type.getTypename(type) !== collectionTypename);
    return types.length > 0 ? Filter.or(...types.map((type) => Filter.type(type))) : undefined;
  }, [schemas]);

  const query = useMemo(
    () =>
      Query.select(filter ?? Filter.everything())
        .orderBy(Order.updated('desc'))
        .limit(RECENT_LIMIT),
    [filter],
  );

  const recent = useQuery(filter && space ? space.db : undefined, query);
  if (recent.length === 0) {
    return null;
  }

  return (
    <HomeSection.Root>
      <HomeSection.Header title={t('space-home.recent.heading')} onClose={onClose} />
      <Masonry.Root Tile={RecentObjectTile}>
        <Masonry.Content padding={false} scrollbars={false}>
          <Masonry.Viewport items={recent} getId={(object) => object.id} />
        </Masonry.Content>
      </Masonry.Root>
    </HomeSection.Root>
  );
};

const RecentObjectTile = ({ data }: { data: Obj.Unknown; index: number }) => {
  const { invokePromise } = useOperationInvoker();
  const { t } = useTranslation(meta.profile.key);
  const typename = Obj.getTypename(data);
  const label = toLocalizedString(
    Obj.getLabel(data) ?? (typename ? ['object-name.placeholder', { ns: typename, defaultValue: 'New item' }] : ''),
    t,
  );
  const iconAnnotation = Obj.getIcon(data);
  const icon = iconAnnotation?.icon ?? 'ph--circle-dashed--regular';
  const iconStyles = iconAnnotation?.hue ? getStyles(iconAnnotation.hue) : undefined;

  const handleClick = useCallback(() => {
    void invokePromise(LayoutOperation.Open, { subject: [Paths.getObjectPathFromObject(data)] });
  }, [invokePromise, data]);

  return (
    <Card.Root role='button' fullWidth classNames='cursor-pointer' onClick={handleClick}>
      <Card.Header>
        <Card.Block>
          <Icon icon={icon} classNames={iconStyles?.text} />
        </Card.Block>
        <Card.Title>{label}</Card.Title>
      </Card.Header>
    </Card.Root>
  );
};

RecentObjectTile.displayName = 'RecentObjectTile';

SpaceHomeRecent.displayName = 'SpaceHomeRecent';
