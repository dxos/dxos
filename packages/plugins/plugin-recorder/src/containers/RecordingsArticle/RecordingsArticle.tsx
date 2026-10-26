//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import type * as Presentation from '@dxos/plugin-presenter/Presentation';
import type * as MediaArtifact from '@dxos/plugin-studio/MediaArtifact';
import * as StudioSurface from '@dxos/plugin-studio/StudioSurface';
import type * as Variant from '@dxos/plugin-studio/Variant';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';

import { type TakeItem, TakeList } from '#components';
import { meta } from '#meta';
import { RecorderCapabilities, Recording, Take } from '#types';

export type RecordingsArticleProps = Pick<AppSurface.ArticleProps, 'role'> & {
  presentation: Presentation.Presentation;
};

/** Desired length of each slide of a presentation, by slide id. */
type Durations = ReadonlyMap<string, number | undefined>;

/**
 * The takes recorded for a presentation (its companion): unsaved takes first, with Retry and Save file, then each
 * saved take with its player and each slide's recorded length against its desired length.
 */
export const RecordingsArticle = ({ role, presentation }: RecordingsArticleProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const db = Obj.getDatabase(presentation);
  const recordings = useQuery(db, Filter.type(Recording.Recording, { presentation: Ref.make(presentation) }));
  const durations = useDurations(presentation);
  const recorder = Hooks.useOptionalCapability(RecorderCapabilities.Recorder);

  return (
    <Panel.Root role={role}>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport classNames='flex flex-col gap-4 p-3'>
            {recorder && <PendingTakes recorder={recorder} presentationId={presentation.id} durations={durations} />}
            {recordings.length === 0 ? (
              <Status.Empty classNames='h-full'>{t('no-recordings.message')}</Status.Empty>
            ) : (
              [...recordings]
                .reverse()
                .map((recording) => <RecordingTakes key={recording.id} recording={recording} durations={durations} />)
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

RecordingsArticle.displayName = 'RecordingsArticle';

const useDurations = (presentation: Presentation.Presentation): Durations => {
  const atom = useMemo(
    () =>
      Atom.make((get) => {
        const slides = get(Obj.atomProperty(presentation, 'slides'));
        return new Map(
          slides.flatMap((ref) => {
            const slide = get(Obj.atom(ref));
            return slide ? [[slide.id, slide.duration] as const] : [];
          }),
        );
      }),
    [presentation],
  );
  return useAtomValue(atom);
};

const toSlides = (log: Take.Log, durations: Durations) =>
  Take.summarize(log).map(({ id, title, seconds }) => ({
    id,
    title: title ?? id,
    seconds,
    duration: durations.get(id),
  }));

const RecordingTakes = ({ recording, durations }: { recording: Recording.Recording; durations: Durations }) => {
  const [audio] = useObject(recording, 'audio');
  const [video] = useObject(recording, 'video');
  return (
    <>
      {video && <ArtifactTakes artifact={video} durations={durations} video />}
      {audio && <ArtifactTakes artifact={audio} durations={durations} />}
    </>
  );
};

const ArtifactTakes = ({
  artifact,
  durations,
  video,
}: {
  artifact: Ref.Ref<MediaArtifact.MediaArtifact>;
  durations: Durations;
  video?: boolean;
}) => {
  const [loaded] = useObject(artifact);
  const variants = loaded?.variants ?? [];
  const cover = loaded?.cover?.uri;
  return (
    <TakeList.Root>
      {[...variants].reverse().map((variant) => (
        <SavedTake
          key={variant.uri}
          variant={variant}
          durations={durations}
          video={video}
          cover={variant.uri === cover}
        />
      ))}
    </TakeList.Root>
  );
};

const SavedTake = ({
  variant,
  durations,
  video,
  cover,
}: {
  variant: Ref.Ref<Variant.Variant>;
  durations: Durations;
  video?: boolean;
  cover: boolean;
}) => {
  const [loaded] = useObject(variant);
  const log = Take.fromConfig(loaded?.config);
  if (!loaded || !log) {
    return null;
  }

  const take: TakeItem = {
    id: loaded.id,
    name: loaded.name ?? loaded.id,
    duration: log.duration,
    cover,
    video,
    slides: toSlides(log, durations),
    player: (
      <Surface.Surface
        type={StudioSurface.VariantRenderer}
        data={{
          variant: { contentType: loaded.contentType, url: loaded.url, content: loaded.content },
          contentType: loaded.contentType ?? '',
        }}
        limit={1}
      />
    ),
  };
  return <TakeList.Item take={take} />;
};

const PendingTakes = ({
  recorder,
  presentationId,
  durations,
}: {
  recorder: RecorderCapabilities.Recorder;
  presentationId: string;
  durations: Durations;
}) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { pending } = useAtomValue(recorder.state);
  const takes = pending.filter((take) => take.presentationId === presentationId);
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
            video: take.log.source !== 'none',
            error: t('unsaved-take.message', { error: take.error }),
            slides: toSlides(take.log, durations),
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
                icon='ph--trash--regular'
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
