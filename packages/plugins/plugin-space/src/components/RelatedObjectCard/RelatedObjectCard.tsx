//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, CardIconSlot, useCardPivot, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Entity } from '@dxos/echo';
import { Card, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { ActionMenu } from '@dxos/react-ui-menu';

import { meta } from '#meta';

export type RelatedObjectCardProps = {
  data: Entity.Unknown;
  classNames?: string;
};

/** Masonry tile renderer for a related entity. */
export const RelatedObjectCard = ({ data: subject, classNames }: RelatedObjectCardProps) => {
  const { t } = useTranslation(meta.profile.key);
  const data = useMemo(() => ({ subject }), [subject]);
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

RelatedObjectCard.displayName = 'RelatedObjectCard';
