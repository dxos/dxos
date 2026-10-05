//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEventHandler, useCallback } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitObjectCard from '@dxos/app-toolkit/ObjectCard';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as SpaceHooks from '@dxos/plugin-space/Hooks';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Menu from '@dxos/react-ui/Menu';
import * as Tag from '@dxos/react-ui/Tag';

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
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [object] = useObject(objectProp);
  const label = Obj.getLabel(object)?.trim() || t('object-card.untitled.label');
  const { archived, item: archiveItem } = SpaceHooks.useArchiveMenuItem(objectProp);
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
    <ToolkitObjectCard.Root
      classNames={onClick && 'dx-hover'}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <ToolkitObjectCard.Header
        subject={object}
        lines={2}
        menu={
          menuItems.length > 0 && (
            <Card.Menu label={t('object-card.menu.label')}>
              {menuItems.map((item) => (
                <Menu.Item
                  key={item.label}
                  item={{ value: item.label, label: item.label, icon: item.icon }}
                  onClick={item.onClick}
                />
              ))}
            </Card.Menu>
          )
        }
      >
        {label}
      </ToolkitObjectCard.Header>
      {archived && (
        <Card.Row>
          <Tag.Tag classNames='justify-self-start'>{t('object-card.archived.label')}</Tag.Tag>
        </Card.Row>
      )}
      {/* The surface emits its own `Card.Body` (see BookmarkCard/RoutineCard), so this must not wrap it —
          a second body would double the card's padding. Nothing renders for a type with no registered
          card surface; the header still identifies it. */}
      <Surface.Surface type={AppSurface.CardContent} data={{ subject: object }} limit={1} />
    </ToolkitObjectCard.Root>
  );
};
