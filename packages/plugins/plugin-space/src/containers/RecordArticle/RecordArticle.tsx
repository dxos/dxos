//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, CardIconSlot, useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { useActionRunner } from '@dxos/plugin-graph/hooks';
import { Card, Flex, Icon, Input, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
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

import { RelatedObjectCard, RelatedTypeFilter } from '#components';
import { useRelatedObjects, useRelatedTypeFilter } from '#hooks';
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

  // Keyed by the record, not this article, so the Related companion shares the same filter.
  const relatedObjects = useRelatedObjects(db, subject, { references: true, relations: true });
  const { types, items: related, toggle } = useRelatedTypeFilter(relatedObjects, Obj.getURI(subject).toString());
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
            {/* TODO(burdon): Remove this section — move the related actions into the object menu. */}
            <Flex column gap='form'>
              <Input.Root>
                <Input.Label>{t('related-actions.label')}</Input.Label>
              </Input.Root>
              <Surface.Surface type={SpaceSurface.Prompts} data={{ subject, attendableId: subject.id }} limit={1} />
            </Flex>

            {/* Gated on the unfiltered set so hiding every type does not remove the filter itself. */}
            {relatedObjects.length > 0 && (
              <div
                className={mx('dx-expander flex flex-col gap-form-gap', singleColumn ? 'dx-card-max-width' : 'w-full')}
              >
                <Input.Root>
                  <Input.Label>{t('related-objects.label')}</Input.Label>
                </Input.Root>
                {/* `self-start` so the group sizes to its icons rather than stretching this column. */}
                <RelatedTypeFilter classNames='self-start' types={types} onToggle={toggle} />
                {/* The masonry's own gutter would inset these cards relative to the record card above,
                    which shares this column — the scroll padding is the article's to own, not theirs. */}
                {/* `centered={false}` on the ROOT, which is column alignment — distinct from
                    `Content`'s prop of the same name below (ScrollArea's scrollbar padding). Centred
                    columns drift right of the record card above them, which shares this column. */}
                <Masonry.Root Tile={RelatedObjectCard} columns={singleColumn ? 1 : undefined} centered={false}>
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
