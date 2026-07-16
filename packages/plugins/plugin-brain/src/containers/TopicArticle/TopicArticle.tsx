//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Topic } from '@dxos/compute';
import { Card, Icon, Panel, ScrollArea, Tag, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type TopicArticleProps = {
  role?: string;
  subject: Topic.Topic;
};

/** A single labelled list section (questions / tasks / thread subjects); omitted when empty. */
const ListSection = ({ icon, label, items }: { icon: string; label: string; items: readonly string[] }) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <Card.Section>
      <Card.Row>
        <Card.Block>
          <Icon icon={icon} />
        </Card.Block>
        <Card.Text classNames='font-medium'>{label}</Card.Text>
      </Card.Row>
      {items.map((item, index) => (
        <Card.Row key={index}>
          <Card.Text variant='description'>{item}</Card.Text>
        </Card.Row>
      ))}
    </Card.Section>
  );
};

/**
 * Detail view for one `Topic`: its label, summary, keyword chips, participants, and rolled-up
 * questions / tasks / member-thread subjects. Renders the topic's own stored fields (self-contained —
 * no cross-object resolution); resolving `threadIds` to live messages with click-to-open is a follow-up.
 */
export const TopicArticle = ({ role, subject: topic }: TopicArticleProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical' padding thin>
          <ScrollArea.Viewport>
            <Card.Root fullWidth border={false}>
              <Card.Header>
                <Card.Block>
                  <Icon icon='ph--stack--regular' />
                </Card.Block>
                <Card.Title>{topic.label}</Card.Title>
              </Card.Header>
              <Card.Body>
                {topic.summary.length > 0 && (
                  <Card.Row>
                    <Card.Text variant='description'>{topic.summary}</Card.Text>
                  </Card.Row>
                )}
                {topic.keywords.length > 0 && (
                  <Card.Row>
                    <Card.Block>
                      <Icon icon='ph--tag--regular' />
                    </Card.Block>
                    <div className='flex flex-wrap gap-1 py-1 -mx-0.5'>
                      {topic.keywords.map((keyword) => (
                        <Tag key={keyword}>{keyword}</Tag>
                      ))}
                    </div>
                  </Card.Row>
                )}
                {topic.participants.length > 0 && (
                  <Card.Row>
                    <Card.Block>
                      <Icon icon='ph--users--regular' />
                    </Card.Block>
                    <Card.Text variant='description'>{topic.participants.join(', ')}</Card.Text>
                  </Card.Row>
                )}
                <ListSection icon='ph--tree-view--regular' label={t('topic.threads.label')} items={topic.threadIds} />
                <ListSection icon='ph--question--regular' label={t('topic.questions.label')} items={topic.questions} />
                <ListSection icon='ph--check-square--regular' label={t('topic.tasks.label')} items={topic.tasks} />
              </Card.Body>
            </Card.Root>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

TopicArticle.displayName = 'TopicArticle';
