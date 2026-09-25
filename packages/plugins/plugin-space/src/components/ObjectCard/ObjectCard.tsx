//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, CardIconSlot, useCardPivot, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Entity, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Card, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { ActionMenu } from '@dxos/react-ui-menu';

import { meta } from '#meta';

export type ObjectCardProps = {
  data: Entity.Unknown;
  classNames?: string;
};

/**
 * One entity as a card: its depiction and label from the schema's annotations, its body from the
 * type's own `CardContent` surface, and the object's graph actions in the header menu.
 *
 * Nothing here is type-specific, and the props are the masonry tile signature, so the same card
 * renders a related object, a record's reference or a tile in a `CardMasonry`.
 */
export const ObjectCard = ({ data: subject, classNames }: ObjectCardProps) => {
  const { t } = useTranslation(meta.profile.key);
  const data = useMemo(() => ({ subject }), [subject]);
  useObject(Obj.isObject(subject) ? subject : undefined);
  const icon = Entity.getIcon(subject)?.icon ?? 'ph--circle-dashed--regular';

  // The card menu renders in a portal; resolve the origin plank from the card element instead.
  const [cardRef, pivotId] = useCardPivot();
  const menuItems = useObjectMenuItems(subject, pivotId);

  return (
    <Card.Root ref={cardRef} classNames={classNames}>
      <Card.Header>
        <Card.Block>
          <CardIconSlot subject={subject}>
            <Icon icon={icon} />
          </CardIconSlot>
        </Card.Block>
        <Card.Title>{Entity.getLabel(subject, { fallback: 'typename' })}</Card.Title>
        <Card.Block end>
          <ActionMenu disabled={!menuItems?.length} actions={menuItems}>
            <IconButton
              iconOnly
              variant='ghost'
              icon='ph--dots-three-vertical--regular'
              label={t('more-actions.label')}
            />
          </ActionMenu>
        </Card.Block>
      </Card.Header>
      <Card.Body>
        <Surface.Surface type={AppSurface.CardContent} data={data} limit={1} />
      </Card.Body>
    </Card.Root>
  );
};

ObjectCard.displayName = 'ObjectCard';
