//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { type Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as StudioHooks from '@dxos/plugin-studio/StudioHooks';
import type * as Variant from '@dxos/plugin-studio/Variant';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';

import { TakeList } from '#components';
import { meta } from '#meta';
import { RecorderCapabilities, RecorderOperation, Take } from '#types';

import { useStartRecording } from '../../hooks/index.ts';
import { downloadUrl, extension } from '../../recorder/index.ts';
import PendingTakes from '../PendingTakes/index.ts';
import TakePlayer from '../TakePlayer/index.ts';

export type SlideRecordingsArticleProps = Pick<AppSurface.ArticleProps, 'role' | 'attendableId'> & {
  slide: Presentation.Slide;
};

/**
 * A slide's takes (its companion), newest first. The toolbar records a new take of this slide; each take can be
 * played, downloaded, made the slide's main take, and deleted (undoably).
 */
export const SlideRecordingsArticle = ({ role, attendableId, slide }: SlideRecordingsArticleProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const recorder = Hooks.useOptionalCapability(RecorderCapabilities.Recorder);
  const presentation = Presentation.getPresentation(slide);
  const handleRecord = useStartRecording(recorder, presentation, slide);
  const [takes] = useObject(slide, 'takes');
  const [mainTake] = useObject(slide, 'mainTake');
  const [desired] = useObject(slide, 'duration');

  const menuActions = useMenuBuilder(
    (): ActionGraphProps =>
      MenuBuilder.make()
        .action(
          'record',
          {
            label: ['record-slide.label', { ns: meta.profile.key }],
            icon: 'ph--record--regular',
            disposition: 'toolbar',
            disabled: !recorder || !presentation,
            testId: 'recorder.slide.record',
          },
          () => void handleRecord(),
        )
        .build(),
    [handleRecord, recorder, presentation],
  );

  const list = [...(takes ?? [])].reverse();
  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport classNames='flex flex-col gap-2 p-3'>
            {recorder && <PendingTakes recorder={recorder} slideId={slide.id} desired={desired} />}
            {list.length === 0 ? (
              <Status.Empty classNames='h-full'>{t('no-takes.message')}</Status.Empty>
            ) : (
              <TakeList.Root>
                {list.map((take) => (
                  <SavedTake
                    key={take.uri}
                    slide={slide}
                    take={take}
                    desired={desired}
                    main={!!mainTake && mainTake.uri === take.uri}
                  />
                ))}
              </TakeList.Root>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

SlideRecordingsArticle.displayName = 'SlideRecordingsArticle';

const SavedTake = ({
  slide,
  take,
  desired,
  main,
}: {
  slide: Presentation.Slide;
  take: Ref.Ref<Variant.Variant>;
  desired?: number;
  main: boolean;
}) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const [loaded] = useObject(take);
  const src = StudioHooks.useVariantSource(loaded ? { url: loaded.url, content: loaded.content } : undefined);
  const [playing, setPlaying] = useState(false);
  const target = take.target;
  const log = Take.fromConfig(loaded?.config);
  if (!loaded || !log || !target) {
    return null;
  }

  const name = loaded.name ?? loaded.id;
  return (
    <TakeList.Item
      take={{
        id: loaded.id,
        name,
        duration: log.duration,
        desired,
        main,
        video: log.source !== 'none',
        // Mounted only while playing, so closing it stops playback.
        player: playing ? <TakePlayer take={target} onEnded={() => setPlaying(false)} /> : undefined,
      }}
      actions={
        <>
          <Button.Root
            data-testid='recorder.take.play'
            icon={playing ? 'ph--stop--regular' : 'ph--play--regular'}
            iconOnly
            variant='ghost'
            label={t(playing ? 'stop-take.label' : 'play-take.label')}
            onClick={() => setPlaying((playing) => !playing)}
          />
          <Button.Root
            data-testid='recorder.take.select'
            icon={main ? 'ph--star--fill' : 'ph--star--regular'}
            iconOnly
            variant='ghost'
            disabled={main}
            label={t('select-take.label')}
            onClick={() => void invokePromise(RecorderOperation.SelectTake, { slide, take: target })}
          />
          <Button.Root
            data-testid='recorder.take.download'
            icon='ph--download-simple--regular'
            iconOnly
            variant='ghost'
            disabled={!src}
            label={t('download-take.label')}
            onClick={() => src && downloadUrl(src, `${name}.${extension(loaded.contentType ?? '')}`)}
          />
          <Button.Root
            data-testid='recorder.take.delete'
            icon='ph--trash--regular'
            iconOnly
            variant='ghost'
            label={t('delete-take.label')}
            onClick={() => void invokePromise(RecorderOperation.DeleteTake, { slide, take: target })}
          />
        </>
      }
    />
  );
};
