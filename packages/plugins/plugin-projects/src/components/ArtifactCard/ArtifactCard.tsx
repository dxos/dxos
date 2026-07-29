//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEventHandler, type PropsWithChildren, useCallback } from 'react';

import { Obj, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Card, Icon, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type ArtifactCardProps = PropsWithChildren<{
  object: Obj.Unknown;
  onClick?: () => void;
  onDelete?: () => void;
}>;

/**
 * Summary tile for one of a project's artifacts. The collection holds `Obj.Unknown`, so the header is
 * driven entirely by schema annotations (icon) and the object's label rather than any one type's
 * fields, and the body is whatever the caller renders for that type — normally the object's
 * `CardContent` surface, passed in rather than resolved here so this stays free of `@dxos/app-framework`
 * and mountable in storybook. Falls back to the type label when no content is supplied.
 * Reactive via {@link useObject} so a rename shows without navigating away and back.
 */
export const ArtifactCard = ({ children, object: objectProp, onClick, onDelete }: ArtifactCardProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [object] = useObject(objectProp);
  const label = Obj.getLabel(object)?.trim() || t('artifact-card.untitled.label');
  const icon = Obj.getIcon(object)?.icon ?? 'ph--file--regular';
  // `Type.getLabel` takes the type entity, not the typename; fall back to the typename's last segment
  // for objects whose schema carries no label annotation.
  const type = Obj.getType(object);
  const typeLabel = (type && Type.getLabel(type)) ?? Obj.getTypename(object)?.split('.').pop();

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
          <Icon icon={icon} />
        </Card.Block>
        <Card.Title classNames='line-clamp-2'>{label}</Card.Title>
        {onDelete && (
          <Card.Menu
            items={[{ label: t('artifact-card.delete.label'), icon: 'ph--trash--regular', onClick: onDelete }]}
          />
        )}
      </Card.Header>
      <Card.Body>
        {children ??
          (typeLabel && (
            <Card.Row>
              <Card.Text variant='description'>{typeLabel}</Card.Text>
            </Card.Row>
          ))}
      </Card.Body>
    </Card.Root>
  );
};
