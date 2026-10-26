//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import type * as Presentation from '@dxos/plugin-presenter/Presentation';
import type * as Variant from '@dxos/plugin-studio/Variant';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { type RecordingItem, RecordingList, RecordingsPanel } from '#components';
import { meta } from '#meta';
import { RecorderCapabilities, Take } from '#types';

import { useStartRecording } from '../../hooks/index.ts';
import { downloadBlob, exportVoiceOver } from '../../recorder/index.ts';
import TakePlayer from '../TakePlayer/index.ts';

export type PresentationRecordingsArticleProps = Pick<AppSurface.ArticleProps, 'role' | 'attendableId'> & {
  presentation: Presentation.Presentation;
};

/** A presented slide as a row, with its main take: the read that voices it. */
type SlideRow = RecordingItem & { take?: Variant.Variant };

/** The first markdown heading of a slide's text, else its first line. */
const headingOf = (content: string): string | undefined =>
  content
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .find((line) => line.length > 0 && !line.startsWith('---'));

/**
 * The presentation's voice-over (its companion), in the layout every Recordings companion shares: each presented
 * slide as a row (its main take, with Play; a double-click opens the slide). The toolbar records every slide (a take per
 * slide), plays every main take in order, and downloads them as one file; the status bar plays the current slide.
 */
export const PresentationRecordingsArticle = ({
  role,
  attendableId,
  presentation,
}: PresentationRecordingsArticleProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const recorder = Hooks.useOptionalCapability(RecorderCapabilities.Recorder);
  const { invokePromise } = Hooks.useOperationInvoker();
  const handleRecord = useStartRecording(recorder, presentation);
  const items = useVoicedSlides(presentation, t);
  const voiced = useMemo(() => items.filter((item) => item.take !== undefined), [items]);

  const [currentId, setCurrentId] = useState<string>();
  const current = items.find((item) => item.id === currentId) ?? items[0];
  // `all` plays every voiced slide from the current one on; the count remounts the player so it starts again.
  const [play, setPlay] = useState<{ count: number; autoPlay: boolean; all: boolean }>({
    count: 0,
    autoPlay: false,
    all: false,
  });
  const stop = useCallback(() => setPlay(({ count }) => ({ count: count + 1, autoPlay: false, all: false })), []);
  // A row's Play plays its slide's main take, or stops it when it is the one playing.
  const handlePlay = useCallback(
    (id: string) => {
      if (play.autoPlay && current?.id === id) {
        stop();
      } else {
        setCurrentId(id);
        setPlay(({ count }) => ({ count: count + 1, autoPlay: true, all: false }));
      }
    },
    [play.autoPlay, current, stop],
  );
  const handlePlayAll = useCallback(() => {
    if (play.autoPlay) {
      stop();
    } else {
      setCurrentId(voiced[0]?.id);
      setPlay(({ count }) => ({ count: count + 1, autoPlay: true, all: true }));
    }
  }, [play.autoPlay, voiced, stop]);
  const handleEnded = useCallback(() => {
    const next = play.all ? voiced[voiced.findIndex((item) => item.id === current?.id) + 1] : undefined;
    if (next) {
      setCurrentId(next.id);
      setPlay(({ count }) => ({ count: count + 1, autoPlay: true, all: true }));
    } else {
      setPlay(({ count }) => ({ count, autoPlay: false, all: false }));
    }
  }, [play.all, voiced, current]);

  const [exporting, setExporting] = useState(false);
  const handleDownload = useCallback(async () => {
    setExporting(true);
    try {
      const takes = voiced.flatMap((item) => (item.take ? [item.take] : []));
      downloadBlob(await exportVoiceOver(takes), `${presentation.name ?? 'presentation'} voice-over.wav`);
    } catch (err) {
      log.catch(err);
    } finally {
      setExporting(false);
    }
  }, [voiced, presentation]);

  const handleOpen = useCallback(
    (id: string) => {
      const db = Obj.getDatabase(presentation);
      if (db) {
        void invokePromise(LayoutOperation.Open, {
          subject: [GraphPath.getCollectionObjectPath(GraphPath.getObjectPathFromObject(presentation), id)],
          workspace: GraphPath.getSpacePath(db.spaceId),
        });
      }
    },
    [presentation, invokePromise],
  );

  const menuActions = useMenuBuilder(
    (): ActionGraphProps =>
      MenuBuilder.make()
        .action(
          'record',
          {
            label: ['record.label', { ns: meta.profile.key }],
            icon: 'ph--record--regular',
            disposition: 'toolbar',
            disabled: !recorder,
            testId: 'recorder.presentation.record',
          },
          () => void handleRecord(),
        )
        .separator()
        .action(
          'download',
          {
            label: ['download-voice-over.label', { ns: meta.profile.key }],
            icon: 'ph--download-simple--regular',
            disposition: 'toolbar',
            disabled: voiced.length === 0 || exporting,
            testId: 'recorder.presentation.download',
          },
          () => void handleDownload(),
        )
        .action(
          'play-all',
          {
            label: [play.all ? 'stop-voice-over.label' : 'play-voice-over.label', { ns: meta.profile.key }],
            icon: play.all ? 'ph--stop-circle--regular' : 'ph--play-circle--regular',
            disposition: 'toolbar',
            disabled: voiced.length === 0,
            testId: 'recorder.presentation.play',
          },
          handlePlayAll,
        )
        .build(),
    [handleRecord, recorder, play, voiced.length, handlePlayAll, exporting, handleDownload],
  );

  return (
    <RecordingsPanel
      role={role}
      toolbar={<ActionToolbar {...menuActions} attendableId={attendableId} />}
      statusbar={
        <TakePlayer
          key={`${current?.id}:${play.count}`}
          take={current?.take}
          autoPlay={play.autoPlay}
          onEnded={handleEnded}
        />
      }
    >
      <RecordingList
        label={t('voice-over.label')}
        items={items}
        value={current?.id}
        onValueChange={(id) => {
          if (id !== current?.id) {
            setCurrentId(id);
            stop();
          }
        }}
        marks
        onToggle={(item) => item.take && handlePlay(item.id)}
        onOpen={(item) => handleOpen(item.id)}
        actions={(item) => [
          {
            id: 'play',
            icon: play.autoPlay && current?.id === item.id ? 'ph--stop--regular' : 'ph--play--regular',
            label: t(play.autoPlay && current?.id === item.id ? 'stop-take.label' : 'play-slide.label'),
            disabled: !item.take,
            onClick: () => handlePlay(item.id),
          },
        ]}
      />
    </RecordingsPanel>
  );
};

PresentationRecordingsArticle.displayName = 'PresentationRecordingsArticle';

/** The presented (not hidden) slides, each with its title, take count, desired length and main take. */
const useVoicedSlides = (
  presentation: Presentation.Presentation,
  t: (key: string, options?: Record<string, unknown>) => string,
): SlideRow[] => {
  const atom = useMemo(
    () =>
      Atom.make((get) =>
        get(Obj.atomProperty(presentation, 'slides')).flatMap((ref): SlideRow[] => {
          const slide = get(Obj.atom(ref));
          if (!slide || slide.hidden) {
            return [];
          }
          const content = get(Obj.atom(slide.content));
          const text = content && 'content' in content && typeof content.content === 'string' ? content.content : '';
          const main = slide.mainTake && get(Obj.atom(slide.mainTake));
          const takeLog = main ? Take.fromConfig(main.config) : undefined;
          return [
            {
              id: slide.id,
              title: slide.title ?? headingOf(text) ?? (content ? Obj.getLabel(content) : undefined) ?? slide.id,
              description: slide.takes?.length ? t('take-count.label', { count: slide.takes.length }) : undefined,
              duration: takeLog?.duration,
              desired: slide.duration,
              main: !!slide.mainTake,
              take: slide.mainTake?.target,
            },
          ];
        }),
      ),
    [presentation, t],
  );
  return useAtomValue(atom);
};
