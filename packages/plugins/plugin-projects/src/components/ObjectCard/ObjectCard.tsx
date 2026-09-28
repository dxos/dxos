//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEventHandler, useCallback } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, CardIconSlot } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useArchiveMenuItem } from '@dxos/plugin-space/hooks';
import { Card, Icon, Tag, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type ObjectCardProps = {
  object: Obj.Unknown;
  onClick?: () => void;
  onDelete?: () => void;
};

/**
 * Summary tile for one of a project's linked objects (an artifact or a routine). Nothing here is
 * type-specific: the header comes from schema annotations (icon) and the object's label, and the body
 * delegates to the object's own `CardContent` surface, so a document previews as a document.
 * Reactive via {@link useObject} so a rename shows without navigating away and back.
 */
export const ObjectCard = ({ object: objectProp, onClick, onDelete }: ObjectCardProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [object] = useObject(objectProp);
  const label = Obj.getLabel(object)?.trim() || t('object-card.untitled.label');
  const icon = Obj.getIcon(object)?.icon ?? 'ph--file--regular';
  const { archived, item: archiveItem } = useArchiveMenuItem(objectProp);
  const menuItems = [
    ...(onDelete ? [{ label: t('object-card.delete.label'), icon: 'ph--trash--regular', onClick: onDelete }] : []),
    ...(archiveItem ? [archiveItem] : []),
  ];

  // `Card.Root` renders `role='button'` when clickable but provides no keyboard handling itself, so
  // Enter/Space activation is wired up here (mirrors native `<button>` key semantics).
  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>(
    (event) => {
      if (!onClick) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        if (event.key === ' ') {
          event.preventDefault();
        }
        onClick();
      }
    },
    [onClick],
  );

  return (
    <Card.Root
      fullWidth
      classNames={onClick && 'dx-hover'}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <Card.Header>
        <Card.Block>
          <CardIconSlot subject={object}>
            <Icon icon={icon} />
          </CardIconSlot>
        </Card.Block>
        <Card.Title classNames='line-clamp-2'>{label}</Card.Title>
        {menuItems.length > 0 && <Card.Menu items={menuItems} />}
      </Card.Header>
      {archived && (
        <Card.Row>
          <Tag classNames='justify-self-start'>{t('object-card.archived.label')}</Tag>
        </Card.Row>
      )}
      {/* The surface emits its own `Card.Body` (see BookmarkCard/RoutineCard), so this must not wrap it —
          a second body would double the card's padding. Nothing renders for a type with no registered
          card surface; the header still identifies it. */}
      <Surface.Surface type={AppSurface.CardContent} data={{ subject: object }} limit={1} />
    </Card.Root>
  );
};
