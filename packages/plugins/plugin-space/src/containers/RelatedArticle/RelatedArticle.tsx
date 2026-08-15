//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useCardPivot, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Entity, Obj } from '@dxos/echo';
import { Card, Icon, IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { type RelatedType, useRelatedObjects, useRelatedTypeFilter } from '#hooks';
import { meta } from '#meta';

export type RelatedArticleProps = Pick<
  AppSurface.ObjectArticleProps<Obj.Unknown, {}, Obj.Unknown>,
  'role' | 'companionTo'
>;

export const RelatedArticle = ({ role, companionTo }: RelatedArticleProps) => {
  const db = Obj.getDatabase(companionTo);
  const related = useRelatedObjects(db, companionTo, { references: true, relations: true });
  // Keyed by the record itself, so each record keeps its own filter and the record article's inline
  // section (which has no toolbar to host the control) narrows with it.
  const contextId = companionTo && Obj.getURI(companionTo).toString();
  const { types, items, toggle } = useRelatedTypeFilter(related, contextId);

  return (
    <Masonry.Root Tile={ObjectCard}>
      <Panel.Root role={role}>
        {/* A single type is the whole set; there is nothing to narrow, so the toolbar stays bare. */}
        {types.length > 1 ? (
          <Panel.Toolbar>
            <TypeFilterToolbar types={types} onToggle={toggle} />
          </Panel.Toolbar>
        ) : (
          <Panel.Toolbar asChild>
            <Toolbar.Root />
          </Panel.Toolbar>
        )}
        <Panel.Content asChild>
          <Masonry.Content centered>
            <Masonry.Viewport items={items} />
          </Masonry.Content>
        </Panel.Content>
      </Panel.Root>
    </Masonry.Root>
  );
};

export type TypeFilterToolbarProps = {
  types: RelatedType[];
  onToggle: (typename: string) => void;
};

/** Toggles the types shown, one item per type present in the related set. */
const TypeFilterToolbar = ({ types, onToggle }: TypeFilterToolbarProps) => {
  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .group(
          'type-filter',
          {
            variant: 'toggleGroup',
            selectCardinality: 'multiple',
            value: types.filter(({ visible }) => visible).map(({ typename }) => typename),
            label: ['type-filter.label', { ns: meta.profile.key }],
          },
          (group) => {
            types.forEach(({ typename, label, icon, count }) => {
              // The type's label is already localized; only the count is appended here.
              group.action(typename, { label: `${label} (${count})`, icon }, () => onToggle(typename));
            });
          },
        )
        .build(),
    [types, onToggle],
  );

  // The companion has no attendable id of its own, and its filter is view state rather than an
  // action on the record, so it stays live whether or not the plank holds attention.
  return (
    <Menu.Root {...menuActions} alwaysActive>
      <Menu.Toolbar>
        <Menu.Items />
      </Menu.Toolbar>
    </Menu.Root>
  );
};

/** Masonry tile renderer for a related entity. */
const ObjectCard = ({ data: subject, classNames }: { data: Entity.Unknown; classNames?: string }) => {
  const { t } = useTranslation(meta.profile.key);
  const data = useMemo(() => ({ subject }), [subject]);
  const icon = Entity.getIcon(subject)?.icon ?? 'ph--circle-dashed--regular';

  // The card menu renders in a portal; resolve the origin plank from the card element instead.
  const [cardRef, pivotId] = useCardPivot();
  const menuItems = useObjectMenuItems(subject, pivotId);

  return (
    <Menu.Root>
      <Card.Root ref={cardRef} classNames={classNames}>
        <Card.Header>
          <Card.Block>
            <Icon icon={icon} />
          </Card.Block>
          <Card.Title>{Entity.getLabel(subject, { fallback: 'typename' })}</Card.Title>
          <Card.Block end>
            <Menu.Trigger asChild disabled={!menuItems?.length}>
              <IconButton
                iconOnly
                variant='ghost'
                icon='ph--dots-three-vertical--regular'
                label={t('more-actions.label')}
              />
            </Menu.Trigger>
            <Menu.Content items={menuItems} />
          </Card.Block>
        </Card.Header>
        <Card.Body>
          <Surface.Surface type={AppSurface.CardContent} data={data} limit={1} />
        </Card.Body>
      </Card.Root>
    </Menu.Root>
  );
};

RelatedArticle.displayName = 'RelatedArticle';
