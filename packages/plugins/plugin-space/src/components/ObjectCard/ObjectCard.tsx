//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType, type KeyboardEvent, type SyntheticEvent, useCallback, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { CardIconSlot } from '@dxos/app-toolkit/CardIconSlot';
import { CardMenuSlot } from '@dxos/app-toolkit/CardMenuSlot';
import { useCardPivot, useObjectMenuItems, useObjectNavigate } from '@dxos/app-toolkit/Hooks';
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
  /** See `AppSurface.CardMasonryData.detailOf`. */
  detailOf?: string;
};

/**
 * One entity as a card: its depiction and label from the schema's annotations, its body from the
 * type's own `CardContent` surface, and the object's graph actions in the header menu. Clicking the
 * card opens its object beside the card's plank, or as `detailOf`'s detail; the menu's Open always
 * opens it beside.
 *
 * Nothing here is type-specific, and the props are the masonry tile signature, so the same card
 * renders a related object, a record's reference or a tile in a `CardMasonry`.
 */
export const ObjectCard = ({ data: subject, classNames, CardMenu, detailOf }: ObjectCardProps) => {
  const { t } = useTranslation(meta.profile.key);
  const data = useMemo(() => ({ subject }), [subject]);
  useObject(Obj.isObject(subject) ? subject : undefined);
  const icon = Entity.getIcon(subject)?.icon ?? 'ph--circle-dashed--regular';

  // The card menu renders in a portal; resolve the origin plank from the card element instead.
  const [cardRef, pivotId] = useCardPivot();
  const objectMenuItems = useObjectMenuItems(subject, pivotId);
  const handleOpen = useObjectNavigate(subject, detailOf);
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (handleOpen && event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        handleOpen(event);
      }
    },
    [handleOpen],
  );
  // The card owns its menu: the object's own items are its actions, and the type's and the host's
  // register theirs as contributions.
  const menu = useMenuActions();
  const menuItems = useMenuItems(menu, undefined, objectMenuItems);

  return (
    <Card.Root
      ref={cardRef}
      classNames={[classNames, handleOpen && 'dx-hover']}
      onClick={handleOpen}
      onKeyDown={handleOpen ? handleKeyDown : undefined}
      role={handleOpen ? 'button' : undefined}
      tabIndex={handleOpen ? 0 : undefined}
    >
      <Card.Header>
        <Card.Block>
          <CardIconSlot subject={subject}>
            <Icon icon={icon} />
          </CardIconSlot>
        </Card.Block>
        <Card.Title>{Entity.getLabel(subject, { fallback: 'typename' })}</Card.Title>
        <Card.Block end>
          {/* React portals bubble through the component tree, so the menu's clicks would reach the card. */}
          <div role='none' className='contents' onClick={stopPropagation}>
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
          </div>
        </Card.Block>
      </Card.Header>
      <Card.Body>
        <Surface.Surface type={AppSurface.CardContent} data={data} limit={1} />
      </Card.Body>
    </Card.Root>
  );
};

ObjectCard.displayName = 'ObjectCard';

const stopPropagation = (event: SyntheticEvent) => event.stopPropagation();
