//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEventHandler, type MouseEventHandler, useCallback } from 'react';

import { Obj, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Card, DropdownMenu, Icon, IconButton, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type ArtifactCardProps = {
  object: Obj.Unknown;
  onClick?: () => void;
  onDelete?: () => void;
};

/**
 * Summary tile for one of a project's artifacts. The collection holds `Obj.Unknown`, so the card is
 * driven entirely by schema annotations (icon) and the object's label rather than any one type's
 * fields. Reactive via {@link useObject} so a rename shows without navigating away and back.
 */
export const ArtifactCard = ({ object: objectProp, onClick, onDelete }: ArtifactCardProps) => {
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

  // The whole card is the click target, so the trigger must not also open the object. Radix's
  // `asChild` composes this with its own handler, so the menu still opens.
  const stopPropagation = useCallback<MouseEventHandler>((event) => event.stopPropagation(), []);

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
          <Card.Block>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <IconButton
                  onClick={stopPropagation}
                  icon='ph--dots-three-vertical--regular'
                  iconOnly
                  density='xs'
                  variant='ghost'
                  tabIndex={-1}
                  label={t('artifact-card.options.label')}
                  data-testid='projectsPlugin.artifactOptions'
                />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content>
                  <DropdownMenu.Viewport>
                    <DropdownMenu.Item onSelect={onDelete} data-testid='projectsPlugin.artifactDelete'>
                      <Icon icon='ph--trash--regular' />
                      <span>{t('artifact-card.delete.label')}</span>
                    </DropdownMenu.Item>
                  </DropdownMenu.Viewport>
                  <DropdownMenu.Arrow />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </Card.Block>
        )}
      </Card.Header>
      {typeLabel && (
        <Card.Body>
          <Card.Row>
            <Card.Text variant='description'>{typeLabel}</Card.Text>
          </Card.Row>
        </Card.Body>
      )}
    </Card.Root>
  );
};
