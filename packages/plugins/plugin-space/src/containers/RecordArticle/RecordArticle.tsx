//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, CardIconSlot, useAppGraph, useCardPivot, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Entity, Obj, Type } from '@dxos/echo';
import { useActionRunner } from '@dxos/plugin-graph/hooks';
import { Card, Icon, IconButton, Input, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import {
  type ActionExecutor,
  type ActionGraphProps,
  Menu,
  MenuBuilder,
  graphActions,
  isToolbarAction,
  useMenuBuilder,
} from '@dxos/react-ui-menu';
import { mx } from '@dxos/ui-theme';

import { useRelatedObjects } from '#hooks';
import { meta } from '#meta';
import { SpaceSurface } from '#types';

export const RecordArticle = ({ role, subject, attendableId }: AppSurface.ObjectArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { actions, onAction } = useMenuActions(attendableId);
  // Obj.getType fails for database-registered (dynamic) schemas due to DXN mismatch;
  // fall back to typename query which matches TypeSchema.typename.
  const db = Obj.getDatabase(subject);
  const typename = Obj.getTypename(subject);
  const schema =
    Obj.getType(subject) ??
    (typename && db
      ? db.graph.registry
          .list()
          .filter(Type.isType)
          .find((t) => Type.getTypename(t) === typename)
      : undefined);
  const icon =
    schema && Type.getDatabase(schema) != null
      ? 'ph--cube--regular'
      : (Obj.getIcon(subject)?.icon ?? 'ph--circle-dashed--regular');

  const related = useRelatedObjects(db, subject, { references: true, relations: true });
  const singleColumn = related.length === 1;

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar>
        <Menu.Root {...actions} attendableId={attendableId} onAction={onAction}>
          <Menu.Toolbar>
            <Menu.Items />
          </Menu.Toolbar>
        </Menu.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='p-4 space-y-4'>
            <Card.Root fullWidth>
              <Card.Header>
                <Card.Block>
                  <CardIconSlot subject={subject}>
                    <Icon icon={icon} />
                  </CardIconSlot>
                </Card.Block>
                <Card.Title>{Obj.getLabel(subject, { fallback: 'typename' })}</Card.Title>
              </Card.Header>
              <Card.Body>
                <Surface.Surface type={AppSurface.CardContent} data={{ subject }} limit={1} />
              </Card.Body>
            </Card.Root>

            {/* TODO(burdon): Only show label if surface exists? */}
            <div className='flex flex-col gap-form-gap'>
              <Input.Root>
                <Input.Label>{t('related-actions.label')}</Input.Label>
              </Input.Root>
              <Surface.Surface type={SpaceSurface.Prompts} data={{ subject, attendableId: subject.id }} limit={1} />
            </div>

            {related.length > 0 && (
              <div
                className={mx('dx-expander flex flex-col gap-form-gap', singleColumn ? 'dx-card-max-width' : 'w-full')}
              >
                <Input.Root>
                  <Input.Label>{t('related-objects.label')}</Input.Label>
                </Input.Root>
                {/* The masonry's own gutter would inset these cards relative to the record card above,
                    which shares this column — the scroll padding is the article's to own, not theirs. */}
                {/* `centered={false}` on the ROOT, which is column alignment — distinct from
                    `Content`'s prop of the same name below (ScrollArea's scrollbar padding). Centred
                    columns drift right of the record card above them, which shares this column. */}
                <Masonry.Root Tile={ObjectCard} columns={singleColumn ? 1 : undefined} centered={false}>
                  <Masonry.Content padding={false} centered={false}>
                    <Masonry.Viewport items={related} />
                  </Masonry.Content>
                </Masonry.Root>
              </div>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

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
            <CardIconSlot subject={subject}>
              <Icon icon={icon} />
            </CardIconSlot>
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

//
// Hooks
//

/**
 * Toolbar actions for the record, sourced from its own app-graph node (`disposition: 'toolbar'`).
 *
 * The record view is type-agnostic, so it must not know which actions a given type affords. Any plugin
 * contributes them to the object's node instead — plugin-crm donates enrichment for `Person` /
 * `Organization` — which keeps plugin-space free of a dependency on them and makes each action appear
 * only for the types that declare it.
 */
const useMenuActions = (
  attendableId?: string,
): { actions: ReturnType<typeof useMenuBuilder>; onAction: ActionExecutor } => {
  const { graph } = useAppGraph();
  const runAction = useActionRunner();

  const menuActions = useMenuBuilder(
    (get): ActionGraphProps =>
      attendableId
        ? MenuBuilder.make()
            .subgraph(graphActions(graph, get, attendableId, { filter: isToolbarAction }))
            .build()
        : MenuBuilder.make().build(),
    [graph, attendableId],
  );

  const onAction: ActionExecutor = useCallback(
    (action) => {
      void runAction(action, { caller: meta.profile.key });
    },
    [runAction],
  );

  return { actions: menuActions, onAction };
};

RecordArticle.displayName = 'RecordArticle';
