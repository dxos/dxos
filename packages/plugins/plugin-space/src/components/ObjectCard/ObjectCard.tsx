//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, CardIconSlot, CardMenuSlot, useCardPivot, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Entity, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Card, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { ActionMenu, useMenuActions, useMenuItems } from '@dxos/react-ui-menu';

import { meta } from '#meta';

export type ObjectCardProps = {
  data: Entity.Unknown;
  classNames?: string;
  /** The host's contribution to this card's menu (see `AppSurface.CardMasonryData.CardMenu`). */
  CardMenu?: ComponentType<AppSurface.CardMenuData<Obj.Unknown>>;
};

/**
 * One entity as a card: its depiction and label from the schema's annotations, its body from the
 * type's own `CardContent` surface, and the object's graph actions in the header menu.
 *
 * Nothing here is type-specific, and the props are the masonry tile signature, so the same card
 * renders a related object, a record's reference or a tile in a `CardMasonry`.
 */
export const ObjectCard = ({ data: subject, classNames, CardMenu }: ObjectCardProps) => {
  const { t } = useTranslation(meta.profile.key);
  const data = useMemo(() => ({ subject }), [subject]);
  useObject(Obj.isObject(subject) ? subject : undefined);
  const icon = Entity.getIcon(subject)?.icon ?? 'ph--circle-dashed--regular';

  // The card menu renders in a portal; resolve the origin plank from the card element instead.
  const [cardRef, pivotId] = useCardPivot();
  const objectMenuItems = useObjectMenuItems(subject, pivotId);
  // The card owns its menu: the object's own items are its actions, and the type's and the host's
  // register theirs as contributions.
  const menu = useMenuActions();
  const menuItems = useMenuItems(menu, undefined, objectMenuItems);

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
          <CardMenuSlot subject={subject} menu={menu} />
          {CardMenu && Obj.isObject(subject) && <CardMenu subject={subject} menu={menu} />}
          <ActionMenu {...menu} disabled={!menuItems?.length} actions={objectMenuItems}>
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
