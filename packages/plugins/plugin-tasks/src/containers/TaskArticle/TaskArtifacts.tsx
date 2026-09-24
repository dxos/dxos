//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, CardIconSlot } from '@dxos/app-toolkit/ui';
import { Obj, type Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Card, Icon, useTranslation } from '@dxos/react-ui';
import { type Task } from '@dxos/types';

import { meta } from '#meta';

export type TaskArtifactsProps = {
  task: Task.Task;
};

/**
 * The objects a task produced (`Task.artifacts`), each as a card whose body is the object's own
 * `CardContent` surface — so an attached image previews as an image. Renders nothing when empty.
 */
export const TaskArtifacts = ({ task }: TaskArtifactsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [refs] = useObject(task, 'artifacts');
  if (!refs || refs.length === 0) {
    return null;
  }

  return (
    <section className='flex flex-col gap-2 p-2' data-testid='tasksPlugin.artifacts'>
      <h2 className='text-sm text-subdued'>{t('task-artifacts.label')}</h2>
      {refs.map((ref) => (
        <ArtifactCard key={ref.uri} artifact={ref} />
      ))}
    </section>
  );
};

/** One artifact, resolved by the card itself so a target that replicates in later still appears. */
const ArtifactCard = ({ artifact }: { artifact: Ref.Ref<Obj.Unknown> }) => {
  const [object] = useObject(artifact);
  if (!object) {
    return null;
  }

  const icon = Obj.getIcon(object)?.icon ?? 'ph--file--regular';
  return (
    <Card.Root fullWidth data-testid='tasksPlugin.artifact'>
      <Card.Header>
        <Card.Block>
          <CardIconSlot subject={object}>
            <Icon icon={icon} />
          </CardIconSlot>
        </Card.Block>
        <Card.Title classNames='line-clamp-2'>{Obj.getLabel(object) ?? object.id}</Card.Title>
      </Card.Header>
      <Surface.Surface type={AppSurface.CardContent} data={{ subject: object }} limit={1} />
    </Card.Root>
  );
};
