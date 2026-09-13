//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Accordion, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Empty, useReorderList } from '@dxos/react-ui-list';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { type StoryboardClip, StoryboardPlayer } from '#components';
import { meta } from '#meta';
import { Frame, MediaArtifact, Storyboard, type Variant } from '#types';

import { FrameArticle } from './FrameArticle.tsx';

const isArtifact = Obj.instanceOf(MediaArtifact.MediaArtifact);
const isFrame = Obj.instanceOf(Frame.Frame);

export type StoryboardArticleProps = AppSurface.ObjectArticleProps<Storyboard.Storyboard>;

/**
 * A vertical storyboard: the frames as a reorderable accordion (one artifact per frame) and a toolbar
 * whose Append frame opens the artifact create dialog — one gesture makes the artifact, parented to
 * its new frame, and the frame, parented to the storyboard. The same vertical shape a slide deck
 * takes; see the plugin design doc.
 */
export const StoryboardArticle = ({ role, subject: storyboard, attendableId }: StoryboardArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  // Live frame objects (not snapshots): the rows mutate them and the drag controller keys on them.
  const [refs] = useObject(storyboard, 'frames');
  const framesAtom = useMemo(
    () =>
      Atom.make((get) => {
        const result: Frame.Frame[] = [];
        for (const ref of refs ?? []) {
          const frame = get(Obj.atomReactive(ref));
          if (frame && isFrame(frame)) {
            result.push(frame);
          }
        }
        return result;
      }),
    [refs],
  );
  const frames = useAtomValue(framesAtom);

  // The frames' cover variants, in order, as a playlist — the view-time splice of the storyboard.
  const clipsAtom = useMemo(
    () =>
      Atom.make((get) => {
        const clips: StoryboardClip[] = [];
        for (const frame of get(framesAtom)) {
          const artifact = frame.artifact ? get(Obj.atomReactive(frame.artifact)) : undefined;
          const cover: Variant.Variant | undefined =
            artifact && isArtifact(artifact) && artifact.cover ? get(Obj.atomReactive(artifact.cover)) : undefined;
          if (cover?.url) {
            clips.push({ id: frame.id, name: frame.name, src: cover.url, contentType: cover.contentType });
          }
        }
        return clips;
      }),
    [framesAtom],
  );
  const clips = useAtomValue(clipsAtom);
  const [playing, setPlaying] = useState(false);

  const handleAppend = useCallback(async () => {
    const db = Obj.getDatabase(storyboard);
    if (!db) {
      return;
    }
    const { data: ref } = await invokePromise(SpaceOperation.OpenObjectForm, {
      target: db,
      typename: Type.getTypename(MediaArtifact.MediaArtifact),
      navigable: false,
    });
    const artifact = ref?.target;
    if (!artifact || !isArtifact(artifact)) {
      return;
    }
    const frame = Storyboard.appendFrame(storyboard, Frame.make({ name: artifact.name, artifact }));
    // Ref before parent edge (the frame's `artifact` ref declares it): the artifact goes with its frame.
    Obj.setParent(artifact, frame);
  }, [storyboard, invokePromise]);

  const handleDelete = useCallback(
    (frame: Frame.Frame) => {
      Storyboard.removeFrame(storyboard, frame);
      Obj.getDatabase(storyboard)?.remove(frame);
    },
    [storyboard],
  );

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => Storyboard.moveFrame(storyboard, fromIndex, toIndex),
    [storyboard],
  );
  const getId = useCallback((frame: Frame.Frame) => frame.id, []);
  const { controller: reorder } = useReorderList<Frame.Frame>({ items: frames, getId, onMove: handleMove });

  const menuActions = useMenuBuilder(
    (): ActionGraphProps =>
      MenuBuilder.make()
        .action(
          'append-frame',
          {
            label: ['append-frame.label', { ns: meta.profile.key }],
            icon: 'ph--plus--regular',
            disposition: 'toolbar',
          },
          () => void handleAppend(),
        )
        .separator('gap')
        .action(
          'play',
          {
            label: [playing ? 'stop.label' : 'play.label', { ns: meta.profile.key }],
            icon: playing ? 'ph--film-strip--regular' : 'ph--play--regular',
            disposition: 'toolbar',
            disabled: clips.length === 0,
          },
          () => setPlaying((current) => !current),
        )
        .build(),
    [handleAppend, playing, clips.length],
  );

  // Every frame open by default; the accordion is the storyboard, not an index of it.
  const defaultValue = useMemo(() => frames.map((frame) => frame.id), [frames.length]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Toolbar>
      {playing ? (
        <Panel.Content>
          <StoryboardPlayer clips={clips} onClose={() => setPlaying(false)} />
        </Panel.Content>
      ) : (
        <Panel.Content asChild>
          <ScrollArea.Root>
            <ScrollArea.Viewport>
              {frames.length === 0 ? (
                <Empty classNames='h-full' label={t('storyboard-empty.message')} />
              ) : (
                <Accordion.Root<Frame.Frame>
                  items={frames}
                  getId={getId}
                  defaultValue={defaultValue}
                  classNames='flex flex-col divide-y divide-subdued-separator'
                >
                  {({ items }) =>
                    items.map((frame, index) => (
                      <FrameArticle
                        key={frame.id}
                        frame={frame}
                        index={index}
                        attendableId={attendableId}
                        reorder={reorder}
                        onDelete={handleDelete}
                      />
                    ))
                  }
                </Accordion.Root>
              )}
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Content>
      )}
    </Panel.Root>
  );
};

StoryboardArticle.displayName = 'StoryboardArticle';
