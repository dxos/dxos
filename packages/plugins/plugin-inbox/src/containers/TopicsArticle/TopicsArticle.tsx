//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useCallback, useMemo } from 'react';

import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { Topic } from '@dxos/pipeline-email';
import { useQuery } from '@dxos/react-client/echo';
import { Card, Icon, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelection } from '@dxos/react-ui-attention';
import { Empty } from '@dxos/react-ui-list';
import { Focus, Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';

import { meta } from '#meta';
import { type Mailbox } from '#types';

export type TopicsArticleProps = AppSurface.SpaceArticleProps<{
  attendableId?: string;
  mailbox: Mailbox.Mailbox;
}>;

type TopicTileData = { readonly topic: Topic; readonly onDelete?: (topic: Topic) => void };

/** Mosaic tile for one `Topic`: label, summary, and a thread/participant count. */
const TopicTile = forwardRef<HTMLDivElement, Pick<MosaicTileProps<TopicTileData>, 'data' | 'location' | 'current'>>(
  ({ data, location, current }, forwardedRef) => {
    const { topic, onDelete } = data;
    const { t } = useTranslation(meta.profile.key);
    const menuItems = useMemo(
      () =>
        onDelete
          ? [{ label: t('topics.delete.label'), icon: 'ph--trash--regular', onClick: () => onDelete(topic) }]
          : undefined,
      [onDelete, topic, t],
    );
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
              <Card.Title>{topic.label}</Card.Title>
              <Card.Menu items={menuItems} />
            </Card.Header>
            <Card.Body>
              {topic.summary.length > 0 && (
                <Card.Row>
                  <Card.Text variant='description'>{topic.summary}</Card.Text>
                </Card.Row>
              )}
              <Card.Row>
                <Card.Text variant='description'>
                  {t('topics.count.label', {
                    threads: topic.threadIds.length,
                    participants: topic.participants.length,
                    questions: topic.questions.length,
                    tasks: topic.tasks.length,
                  })}
                </Card.Text>
              </Card.Row>
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
  const id = String(attendableId ?? Obj.getURI(mailbox));
  const currentId = useSelection(id, 'single');
  const topics = useQuery(space.db, Filter.type(Topic));
  const showItem = useShowItem();
  const handleDelete = useCallback((topic: Topic) => space.db.remove(topic), [space.db]);
  // Open the selected topic's detail (`TopicArticle`) following the layout mode — companion in
  // simple mode, companion swap otherwise (deck-peer needs a topic path; a follow-up).
  const handleOpen = useCallback(
    (topicId: string | undefined) => {
      if (topicId) {
        void showItem({ contextId: id, selectionId: topicId, companion: linkedSegment('topic') });
      }
    },
    [id, showItem],
  );
  const items = useMemo(() => topics.map((topic) => ({ topic, onDelete: handleDelete })), [topics, handleDelete]);

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        {items.length === 0 ? (
          <Empty label={t('topics.empty.message')} />
        ) : (
          <Focus.Group asChild>
            <Mosaic.Container asChild withFocus currentId={currentId} onCurrentChange={handleOpen}>
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
