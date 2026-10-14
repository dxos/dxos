//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as CollectionOperation from '@dxos/app-toolkit/CollectionOperation';
import * as ObjectCard from '@dxos/app-toolkit/ObjectCard';
import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import { Obj, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Card from '@dxos/react-ui/Card';
import * as Focus from '@dxos/react-ui/Focus';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Menu from '@dxos/react-ui/Menu';
import * as Tag from '@dxos/react-ui/Tag';
import { CardAnnotation } from '@dxos/schema';
import { osTranslations } from '@dxos/ui-theme';

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
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  // Subscribe so the label re-renders when the object changes.
  const [live] = useObject(object);
  const typename = Obj.getTypename(live);
  const label =
    Obj.getLabel(live) ||
    t('object-name.placeholder', { ns: typename ?? meta.profile.key, defaultValue: t('object-name.placeholder') });

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
      <ObjectCard.Root classNames={['dx-hover', onSelect && 'cursor-pointer', current && 'dx-current']}>
        <ObjectCard.Header
          subject={live}
          menu={
            menuItems.length > 0 && (
              <Card.Menu label={t('toolbar-menu.label', { ns: osTranslations })}>
                {menuItems.map((menuItem) => (
                  <Menu.Item
                    key={menuItem.label}
                    item={{ value: menuItem.label, label: menuItem.label, icon: menuItem.icon }}
                    onClick={menuItem.onClick}
                  />
                ))}
              </Card.Menu>
            )
          }
        >
          {label}
        </ObjectCard.Header>
        {archived && (
          <Card.Row>
            <Tag.Tag classNames='justify-self-start'>{t('archived.label')}</Tag.Tag>
          </Card.Row>
        )}
        {showCardContent && <Surface.Surface type={AppSurface.CardContent} data={cardData} limit={1} />}
      </ObjectCard.Root>
    </Focus.Item>
  );
};

ObjectTile.displayName = 'ObjectTile';
