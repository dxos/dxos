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
import * as UiHooks from '@dxos/react-ui/Hooks';

import { type RecordingItem, RecordingList, RecordingsPanel } from '#components';
import { meta } from '#meta';
import { RecorderCapabilities, RecorderOperation, Take } from '#types';

import { useStartRecording } from '../../hooks/index.ts';
import TakePlayer from '../TakePlayer/index.ts';

export type SlideRecordingsArticleProps = Pick<AppSurface.ArticleProps, 'role' | 'attendableId'> & {
  slide: Presentation.Slide;
};

/** A saved take as a row, with the live take the actions need. */
type TakeRow = RecordingItem & { take?: Variant.Variant };

/**
 * A slide's takes (its companion), newest first, in the layout every Recordings companion shares. The toolbar records
 * a new take of the slide (and saves an unsaved one again); each take's row has a star that makes it the main take,
 * Play (in the status bar) and Delete (undoable; it discards an unsaved take, which is listed first).
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
  // A row's Play plays its take, or stops it when it is the one playing.
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
  // A saved take is deleted undoably; an unsaved one is discarded.
  const handleDelete = useCallback(
    (item: TakeRow) => {
      if (item.error) {
        recorder?.discard(item.id);
      } else if (item.take) {
        void invokePromise(RecorderOperation.DeleteTake, { slide, take: item.take });
      }
    },
    [recorder, invokePromise, slide],
  );

  const menuActions = useMenuBuilder((): ActionGraphProps => {
    const builder = MenuBuilder.make().action(
      'record',
      {
        label: ['record-slide.label', { ns: meta.profile.key }],
        icon: 'ph--record--regular',
        disposition: 'toolbar',
        disabled: !recorder || !presentation,
        testId: 'recorder.slide.record',
      },
      () => void handleRecord(),
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
  }, [handleRecord, recorder, presentation, current]);

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
        onMain={(item) => item.take && void invokePromise(RecorderOperation.SelectTake, { slide, take: item.take })}
        onToggle={(item) => handlePlay(item.id)}
        actions={(item) => [
          {
            id: 'play',
            icon: play.autoPlay && current?.id === item.id ? 'ph--stop--regular' : 'ph--play--regular',
            label: t(play.autoPlay && current?.id === item.id ? 'stop-take.label' : 'play-take.label'),
            disabled: !item.take,
            onClick: () => handlePlay(item.id),
          },
          {
            id: 'delete',
            icon: 'ph--trash--regular',
            label: t(item.error ? 'discard-take.label' : 'delete-take.label'),
            onClick: () => handleDelete(item),
          },
        ]}
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
              take: ref.target,
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
      error: true,
    }));
};

const EMPTY = Atom.make<RecorderCapabilities.RecorderState>({ status: 'idle', pending: [] });
