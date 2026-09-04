//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, CardIconSlot } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Card, Focus, Icon, useTranslation } from '@dxos/react-ui';
import { CardAnnotation } from '@dxos/schema';
import { getStyles } from '@dxos/ui-theme';

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
    ],
    [t, typename, onOpen, onDelete, object],
  );

  return (
    <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
      <Card.Root fullWidth classNames={['dx-hover', onSelect && 'cursor-pointer', current && 'dx-current']}>
        <Card.Header>
          <Card.Block>
            <CardIconSlot subject={live}>
              <Icon icon={icon} classNames={iconStyles?.text} />
            </CardIconSlot>
          </Card.Block>
          <Card.Title>{label}</Card.Title>
          {menuItems.length > 0 && <Card.Menu items={menuItems} />}
        </Card.Header>
        {showCardContent && <Surface.Surface type={AppSurface.CardContent} data={cardData} limit={1} />}
      </Card.Root>
    </Focus.Item>
  );
};

ObjectTile.displayName = 'ObjectTile';
