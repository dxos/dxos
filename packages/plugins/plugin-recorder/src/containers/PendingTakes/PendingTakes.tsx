//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { TakeList } from '#components';
import { meta } from '#meta';
import { type RecorderCapabilities } from '#types';

/** Takes that could not be saved (of one slide, or all), with Save again, Download and Discard. */
export type PendingTakesProps = {
  recorder: RecorderCapabilities.Recorder;
  slideId?: string;
  desired?: number;
};

export const PendingTakes = ({ recorder, slideId, desired }: PendingTakesProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { pending } = useAtomValue(recorder.state);
  const takes = pending.filter((take) => slideId === undefined || take.slideId === slideId);
  if (takes.length === 0) {
    return null;
  }

  return (
    <TakeList.Root>
      {takes.map((take) => (
        <TakeList.Item
          key={take.id}
          take={{
            id: take.id,
            name: take.name,
            duration: take.log.duration,
            desired,
            video: take.log.source !== 'none',
            error: t('unsaved-take.message', { error: take.error }),
          }}
          actions={
            <>
              <Button.Root
                data-testid='recorder.take.retry'
                icon='ph--arrow-clockwise--regular'
                iconOnly
                variant='ghost'
                label={t('retry-save.label')}
                onClick={() => void recorder.retry(take.id)}
              />
              <Button.Root
                data-testid='recorder.take.download'
                icon='ph--download-simple--regular'
                iconOnly
                variant='ghost'
                label={t('download-take.label')}
                onClick={() => recorder.download(take.id)}
              />
              <Button.Root
                data-testid='recorder.take.discard'
                icon='ph--x--regular'
                iconOnly
                variant='ghost'
                label={t('discard-take.label')}
                onClick={() => recorder.discard(take.id)}
              />
            </>
          }
        />
      ))}
    </TakeList.Root>
  );
};

PendingTakes.displayName = 'PendingTakes';
