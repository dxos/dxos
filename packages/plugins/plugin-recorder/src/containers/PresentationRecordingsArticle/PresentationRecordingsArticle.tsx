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
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { type SlideTakesItem, SlideTakesList } from '#components';
import { meta } from '#meta';
import { RecorderCapabilities, Take } from '#types';

import { useStartRecording } from '../../hooks/index.ts';
import { downloadBlob, exportVoiceOver } from '../../recorder/index.ts';
import PendingTakes from '../PendingTakes/index.ts';
import TakePlayer from '../TakePlayer/index.ts';

export type PresentationRecordingsArticleProps = Pick<AppSurface.ArticleProps, 'role' | 'attendableId'> & {
  presentation: Presentation.Presentation;
};

/** A presented slide with its main take, the read that voices it. */
type VoicedSlide = SlideTakesItem & { take?: Variant.Variant };

/** The first markdown heading of a slide's text, else its first line. */
const headingOf = (content: string): string | undefined =>
  content
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .find((line) => line.length > 0 && !line.startsWith('---'));

/**
 * The presentation's voice-over (its companion): every presented slide with its main take. The toolbar records the
 * whole presentation (split into a take per slide), plays the main takes in order, and downloads them as one file.
 */
export const PresentationRecordingsArticle = ({
  role,
  attendableId,
  presentation,
}: PresentationRecordingsArticleProps) => {
  const recorder = Hooks.useOptionalCapability(RecorderCapabilities.Recorder);
  const { invokePromise } = Hooks.useOperationInvoker();
  const handleRecord = useStartRecording(recorder, presentation);
  const slides = useVoicedSlides(presentation);
  const voiced = useMemo(() => slides.filter((slide) => slide.take !== undefined), [slides]);

  // The slides queued to play, in order; the first is playing.
  const [queue, setQueue] = useState<string[]>([]);
  const playing = slides.find((slide) => slide.id === queue[0]);
  const handlePlaySlide = useCallback((id: string) => setQueue((queue) => (queue[0] === id ? [] : [id])), []);
  const handlePlayAll = useCallback(
    () => setQueue((queue) => (queue.length > 0 ? [] : voiced.map((slide) => slide.id))),
    [voiced],
  );

  const [exporting, setExporting] = useState(false);
  const handleDownload = useCallback(async () => {
    setExporting(true);
    try {
      const takes = voiced.flatMap((slide) => (slide.take ? [slide.take] : []));
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
        .action(
          'play',
          {
            label: [queue.length > 0 ? 'stop-voice-over.label' : 'play-voice-over.label', { ns: meta.profile.key }],
            icon: queue.length > 0 ? 'ph--stop--regular' : 'ph--play--regular',
            disposition: 'toolbar',
            disabled: voiced.length === 0,
            testId: 'recorder.presentation.play',
          },
          handlePlayAll,
        )
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
        .build(),
    [handleRecord, recorder, queue.length, voiced.length, handlePlayAll, handleDownload, exporting],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport classNames='flex flex-col gap-2 p-3'>
            {playing?.take && (
              <TakePlayer key={playing.id} take={playing.take} onEnded={() => setQueue((queue) => queue.slice(1))} />
            )}
            {recorder && <PendingTakes recorder={recorder} />}
            <SlideTakesList slides={slides} playing={queue[0]} onPlay={handlePlaySlide} onOpen={handleOpen} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

PresentationRecordingsArticle.displayName = 'PresentationRecordingsArticle';

/** The presented (not hidden) slides, each with its title, take count, desired length and main take. */
const useVoicedSlides = (presentation: Presentation.Presentation): VoicedSlide[] => {
  const atom = useMemo(
    () =>
      Atom.make((get) =>
        get(Obj.atomProperty(presentation, 'slides')).flatMap((ref): VoicedSlide[] => {
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
              takes: slide.takes?.length ?? 0,
              duration: takeLog?.duration,
              desired: slide.duration,
              take: slide.mainTake?.target,
            },
          ];
        }),
      ),
    [presentation],
  );
  return useAtomValue(atom);
};
