//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import * as Presentation from '@dxos/plugin-presenter/Presentation';
import type * as Variant from '@dxos/plugin-studio/Variant';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { type RecordingItem, RecordingList, RecordingsPanel } from '#components';
import { meta } from '#meta';
import { RecorderCapabilities, RecorderOperation, Take } from '#types';

import { useStartRecording, useTakeUrl } from '../../hooks/index.ts';
import { downloadUrl, extension } from '../../recorder/index.ts';
import TakePlayer from '../TakePlayer/index.ts';

export type SlideRecordingsArticleProps = Pick<AppSurface.ArticleProps, 'role' | 'attendableId'> & {
  slide: Presentation.Slide;
};

/** A saved take as a row, with the live take the actions need. */
type TakeRow = RecordingItem & { take?: Variant.Variant; contentType?: string };

/**
 * A slide's takes (its companion), newest first, in the layout every Recordings companion shares. The toolbar records
 * a new take of the slide and acts on the current take — download, delete (undoably); each tile's star makes it the main take,
 * and its Play plays it in the status bar. An unsaved take is listed first, and the toolbar saves it again, downloads or discards it.
 */
export const SlideRecordingsArticle = ({ role, attendableId, slide }: SlideRecordingsArticleProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const recorder = Hooks.useOptionalCapability(RecorderCapabilities.Recorder);
  const { invokePromise } = Hooks.useOperationInvoker();
  const presentation = Presentation.getPresentation(slide);
  const handleRecord = useStartRecording(recorder, presentation, slide);
  const saved = useSlideTakes(slide);
  const pending = usePendingTakes(recorder, slide);
  const items = useMemo(() => [...pending, ...saved], [pending, saved]);

  const [currentId, setCurrentId] = useState<string>();
  const current = items.find((item) => item.id === currentId) ?? items[0];
  // Bumped by Play so the status bar player remounts and starts.
  const [play, setPlay] = useState<{ count: number; autoPlay: boolean }>({ count: 0, autoPlay: false });
  // A tile's Play plays its take, or stops it when it is the one playing.
  const handlePlay = useCallback(
    (id: string) => {
      if (play.autoPlay && current?.id === id) {
        setPlay(({ count }) => ({ count: count + 1, autoPlay: false }));
      } else {
        setCurrentId(id);
        setPlay(({ count }) => ({ count: count + 1, autoPlay: true }));
      }
    },
    [play.autoPlay, current],
  );
  const src = useTakeUrl(current?.take);

  const handleDownload = useCallback(() => {
    if (current?.error) {
      recorder?.download(current.id);
    } else if (src && current) {
      downloadUrl(src, `${current.take?.name ?? current.id}.${extension(current.contentType ?? '')}`);
    }
  }, [current, src, recorder]);

  const handleDelete = useCallback(() => {
    if (current?.error) {
      recorder?.discard(current.id);
    } else if (current?.take) {
      void invokePromise(RecorderOperation.DeleteTake, { slide, take: current.take });
    }
  }, [current, recorder, invokePromise, slide]);

  const menuActions = useMenuBuilder((): ActionGraphProps => {
    const builder = MenuBuilder.make()
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
      .separator()
      .action(
        'download',
        {
          label: ['download-take.label', { ns: meta.profile.key }],
          icon: 'ph--download-simple--regular',
          disposition: 'toolbar',
          disabled: !current || (!current.error && !src),
          testId: 'recorder.take.download',
        },
        handleDownload,
      )
      .action(
        'delete',
        {
          label: [current?.error ? 'discard-take.label' : 'delete-take.label', { ns: meta.profile.key }],
          icon: 'ph--trash--regular',
          disposition: 'toolbar',
          disabled: !current,
          testId: 'recorder.take.delete',
        },
        handleDelete,
      );
    if (current?.error) {
      builder.action(
        'retry',
        {
          label: ['retry-save.label', { ns: meta.profile.key }],
          icon: 'ph--arrow-clockwise--regular',
          disposition: 'toolbar',
          testId: 'recorder.take.retry',
        },
        () => void recorder?.retry(current.id),
      );
    }
    return builder.build();
  }, [handleRecord, recorder, presentation, current, src, invokePromise, slide, handleDownload, handleDelete]);

  return (
    <RecordingsPanel
      role={role}
      toolbar={<ActionToolbar {...menuActions} attendableId={attendableId} />}
      statusbar={
        <TakePlayer
          key={`${current?.id}:${play.count}`}
          take={current?.take}
          autoPlay={play.autoPlay}
          onEnded={() => setPlay(({ count }) => ({ count, autoPlay: false }))}
        />
      }
    >
      <RecordingList
        label={t('slide-takes.label')}
        items={items}
        value={current?.id}
        onValueChange={(id) => {
          if (id !== current?.id) {
            setCurrentId(id);
            setPlay(({ count }) => ({ count: count + 1, autoPlay: false }));
          }
        }}
        renderActions={(item) => (
          <>
            <Button.Root
              data-testid='recorder.take.select'
              icon={item.main ? 'ph--star--fill' : 'ph--star--regular'}
              iconOnly
              variant='ghost'
              classNames={item.main ? 'text-accent-text' : undefined}
              disabled={!item.take}
              label={t(item.main ? 'main-take.label' : 'select-take.label')}
              onClick={() =>
                item.take && !item.main && void invokePromise(RecorderOperation.SelectTake, { slide, take: item.take })
              }
            />
            <Button.Root
              data-testid='recorder.take.play'
              icon={play.autoPlay && current?.id === item.id ? 'ph--stop--regular' : 'ph--play--regular'}
              iconOnly
              variant='ghost'
              disabled={!item.take}
              label={t(play.autoPlay && current?.id === item.id ? 'stop-take.label' : 'play-take.label')}
              onClick={() => handlePlay(item.id)}
            />
          </>
        )}
      />
    </RecordingsPanel>
  );
};

SlideRecordingsArticle.displayName = 'SlideRecordingsArticle';

/** The slide's saved takes, newest first. */
const useSlideTakes = (slide: Presentation.Slide): TakeRow[] => {
  const atom = useMemo(
    () =>
      Atom.make((get): TakeRow[] => {
        const snapshot = get(Obj.atom(slide));
        const mainUri = snapshot.mainTake?.uri;
        return [...(snapshot.takes ?? [])].reverse().flatMap((ref): TakeRow[] => {
          const take = get(Obj.atom(ref));
          const takeLog = take ? Take.fromConfig(take.config) : undefined;
          if (!take || !takeLog) {
            return [];
          }
          return [
            {
              id: take.id,
              title: take.name ? Take.formatName(take.name) : take.id,
              duration: takeLog.duration,
              desired: snapshot.duration,
              main: ref.uri === mainUri,
              video: takeLog.source !== 'none',
              take: ref.target,
              contentType: take.contentType,
            },
          ];
        });
      }),
    [slide],
  );
  return useAtomValue(atom);
};

/** The slide's takes that could not be saved. */
const usePendingTakes = (recorder: RecorderCapabilities.Recorder | undefined, slide: Presentation.Slide): TakeRow[] => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const state = useAtomValue(recorder?.state ?? EMPTY);
  return state.pending
    .filter((take) => take.slideId === slide.id)
    .map((take) => ({
      id: take.id,
      title: Take.formatName(take.name),
      description: t('unsaved-take.message', { error: take.error }),
      duration: take.log.duration,
      desired: slide.duration,
      video: take.log.source !== 'none',
      error: true,
    }));
};

const EMPTY = Atom.make<RecorderCapabilities.RecorderState>({ status: 'idle', pending: [] });
