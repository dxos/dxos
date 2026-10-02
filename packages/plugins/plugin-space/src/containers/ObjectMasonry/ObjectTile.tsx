//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as CardIconSlot from '@dxos/app-toolkit/CardIconSlot';
import * as CollectionOperation from '@dxos/app-toolkit/CollectionOperation';
import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import { Obj, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Card, Focus, Icon, Tag, useTranslation } from '@dxos/react-ui';
import { CardAnnotation } from '@dxos/schema';
import { getStyles, osTranslations } from '@dxos/ui-theme';

import { useArchiveMenuItem } from '#hooks';
import { meta } from '#meta';

/** Callbacks are absent on a read-only tile (e.g. a staged merge result). */
export type TileData = {
  object: Obj.Unknown;
  current: boolean;
  onSelect?: (id: string) => void;
  onOpen?: (object: Obj.Unknown) => void;
  onDelete?: (object: Obj.Unknown) => void;
};

export const TileAdapter = ({ data }: { data: TileData | undefined; index: number }) => {
  if (!data?.object) {
    return null;
  }

  return <ObjectTile {...data} />;
};

/** Selectable header-only card for a single object. */
export const ObjectTile = ({ object, current, onSelect, onOpen, onDelete }: TileData) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  // Subscribe so the label re-renders when the object changes.
  const [live] = useObject(object);
  const typename = Obj.getTypename(live);
  const label =
    Obj.getLabel(live) ||
    t('object-name.placeholder', { ns: typename ?? meta.profile.key, defaultValue: t('object-name.placeholder') });

  const iconAnnotation = Obj.getIcon(live);
  const icon = iconAnnotation?.icon ?? 'ph--circle-dashed--regular';
  const iconStyles = iconAnnotation?.hue ? getStyles(iconAnnotation.hue) : undefined;

  // Render a content preview body only for types that opt in via `CardAnnotation`.
  const type = Obj.getType(object);
  const showCardContent = !!type && Option.getOrElse(CardAnnotation.get(Type.getSchema(type)), () => false);
  const cardData = useMemo<AppSurface.ObjectCardData>(() => ({ subject: object }), [object]);

  const { archived, item: archiveItem } = useArchiveMenuItem(object);

  // `Focus.Item` calls `onCurrentChange` on click and on Enter. A card click toggles selection —
  // the companion follows the selection, so navigating away on every click would fight the review
  // workflow; opening stays available from the card menu.
  const handleCurrentChange = useCallback(() => onSelect?.(object.id), [onSelect, object]);

  const menuItems = useMemo(
    () => [
      ...(onOpen
        ? [
            {
              icon: 'ph--arrow-square-out--regular',
              label: t('open-object.label', {
                ns: typename ?? meta.profile.key,
                defaultValue: t('open-object.label'),
              }),
              onClick: () => onOpen(object),
            },
          ]
        : []),
      // Offered where the tile is interactive, which is where it can be opened.
      ...(onOpen && TypeOptions.isUserObject(object)
        ? [
            {
              icon: CollectionOperation.OpenAddToCollection.meta.icon,
              label: t('add-to-collection.label', { ns: osTranslations }),
              onClick: () => void invokePromise(CollectionOperation.OpenAddToCollection, { object }),
            },
          ]
        : []),
      ...(onDelete
        ? [
            {
              icon: 'ph--trash--regular',
              label: t('delete-object.label', {
                ns: typename ?? meta.profile.key,
                defaultValue: t('delete-object.label'),
              }),
              onClick: () => onDelete(object),
            },
          ]
        : []),
      ...(archiveItem ? [archiveItem] : []),
    ],
    [t, typename, onOpen, onDelete, archiveItem, object, invokePromise],
  );

  return (
    <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
      <Card.Root fullWidth classNames={['dx-hover', onSelect && 'cursor-pointer', current && 'dx-current']}>
        <Card.Header>
          <Card.Block>
            <CardIconSlot.Root subject={live}>
              <Icon icon={icon} classNames={iconStyles?.text} />
            </CardIconSlot.Root>
          </Card.Block>
          <Card.Title>{label}</Card.Title>
          {menuItems.length > 0 && <Card.Menu items={menuItems} />}
        </Card.Header>
        {archived && (
          <Card.Row>
            <Tag classNames='justify-self-start'>{t('archived.label')}</Tag>
          </Card.Row>
        )}
        {showCardContent && <Surface.Surface type={AppSurface.CardContent} data={cardData} limit={1} />}
      </Card.Root>
    </Focus.Item>
  );
};

ObjectTile.displayName = 'ObjectTile';
