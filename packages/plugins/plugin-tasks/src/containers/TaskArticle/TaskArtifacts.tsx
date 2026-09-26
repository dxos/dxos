//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, CardIconSlot, useCardPivot, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Entity, Obj, type Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Card, Column, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { ActionMenu } from '@dxos/react-ui-menu';
import { type Task } from '@dxos/types';

import { TaskMasonry } from '#components';
import { meta } from '#meta';

export type TaskArtifactsProps = {
  task: Task.Task;
};

/**
 * What the task produced (`Task.artifacts`), as cards in the same masonry as its attachments. Absent
 * rather than empty for a task with no artifacts.
 */
export const TaskArtifacts = ({ task }: TaskArtifactsProps) => {
  const { t } = useTranslation(meta.profile.key);
  // The property, not the whole task: the query re-emits on membership only, so an artifact recorded
  // on the open task would otherwise not reach the grid until the reader selected away and back.
  const [artifacts] = useObject(task, 'artifacts');
  if (!artifacts || artifacts.length === 0) {
    return null;
  }

  return (
    <Column.Section label={t('task-artifacts.label')} data-testid='tasksPlugin.artifacts'>
      <TaskMasonry
        items={artifacts}
        getId={getArtifactId}
        Tile={ArtifactCard}
        cacheKey={`${Obj.getURI(task).toString()}/artifacts`}
      />
    </Column.Section>
  );
};

const getArtifactId = (ref: Ref.Ref<Obj.Unknown>): string => ref.uri;

/**
 * One artifact: depiction and label from the schema's annotations, body from the type's own
 * `CardContent` surface, and the object's graph actions in the header menu. Resolved by the card
 * itself so an artifact that replicates in later still appears.
 */
const ArtifactCard = ({ data: artifact }: { data: Ref.Ref<Obj.Unknown> }) => {
  const { t } = useTranslation(meta.profile.key);
  const [subject] = useObject(artifact);
  const data = useMemo(() => (subject ? { subject } : undefined), [subject]);
  // The card menu renders in a portal; resolve the origin plank from the card element instead.
  const [cardRef, pivotId] = useCardPivot();
  const menuItems = useObjectMenuItems(subject, pivotId);
  if (!subject || !data) {
    return null;
  }

  const icon = Entity.getIcon(subject)?.icon ?? 'ph--circle-dashed--regular';
  return (
    <Card.Root ref={cardRef} fullWidth data-testid='tasksPlugin.artifact'>
      <Card.Header>
        <Card.Block>
          <CardIconSlot subject={subject}>
            <Icon icon={icon} />
          </CardIconSlot>
        </Card.Block>
        <Card.Title classNames='truncate'>{Entity.getLabel(subject, { fallback: 'typename' })}</Card.Title>
        <Card.Block end>
          <ActionMenu disabled={!menuItems?.length} actions={menuItems}>
            <IconButton
              iconOnly
              variant='ghost'
              icon='ph--dots-three-vertical--regular'
              label={t('task-artifact.more-actions.label')}
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
