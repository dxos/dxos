//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { Topic } from '@dxos/pipeline-email';
import { useQuery } from '@dxos/react-client/echo';
import { Card, Icon, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { Empty } from '@dxos/react-ui-list';
import { Focus, Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';

import { meta } from '#meta';
import { type Mailbox } from '#types';

export type TopicsArticleProps = AppSurface.SpaceArticleProps<{
  attendableId?: string;
  mailbox: Mailbox.Mailbox;
}>;

type TopicTileData = { readonly topic: Topic };

/** Mosaic tile for one `Topic`: label, summary, and a thread/participant count. */
const TopicTile = forwardRef<HTMLDivElement, Pick<MosaicTileProps<TopicTileData>, 'data' | 'location' | 'current'>>(
  ({ data, location, current }, forwardedRef) => {
    const { topic } = data;
    const { t } = useTranslation(meta.profile.key);
    return (
      <Mosaic.Tile
        asChild
        classNames='dx-hover dx-current border-b border-subdued-separator'
        id={topic.id}
        data={data}
        location={location}
      >
        <Focus.Item asChild current={current}>
          <Card.Root fullWidth border={false} ref={forwardedRef}>
            <Card.Header>
              <Card.Block>
                <Icon icon='ph--stack--regular' />
              </Card.Block>
              <Card.Title classNames='truncate'>{topic.label}</Card.Title>
            </Card.Header>
            <Card.Body>
              {topic.summary.length > 0 && <Card.Text variant='description'>{topic.summary}</Card.Text>}
              <Card.Text variant='description'>
                {t('topics.count.label', { threads: topic.threadIds.length, participants: topic.participants.length })}
              </Card.Text>
            </Card.Body>
          </Card.Root>
        </Focus.Item>
      </Mosaic.Tile>
    );
  },
);

TopicTile.displayName = 'TopicTile';

/**
 * Topics list for a mailbox — a `react-ui-mosaic` stack of the space's `Topic` objects (produced by
 * the `AnalyzeTopics` operation). Queries all topics in the space; scoping to the mailbox via the
 * `AnchoredTo` relation is a follow-up.
 */
export const TopicsArticle = ({ role, space, attendableId, mailbox }: TopicsArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const id = attendableId ?? Obj.getURI(mailbox);
  const currentId = useSelection(id, 'single');
  const topics = useQuery(space.db, Filter.type(Topic));
  const items = useMemo(() => topics.map((topic) => ({ topic })), [topics]);

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        {items.length === 0 ? (
          <Empty label={t('topics.empty.message')} />
        ) : (
          <Focus.Group asChild>
            <Mosaic.Container asChild withFocus currentId={currentId}>
              <ScrollArea.Root orientation='vertical' padding thin>
                <ScrollArea.Viewport>
                  <Mosaic.Stack Tile={TopicTile} items={items} draggable={false} getId={(item) => item.topic.id} />
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            </Mosaic.Container>
          </Focus.Group>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

TopicsArticle.displayName = 'TopicsArticle';
