//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Panel, ScrollArea, Splitter, useTranslation } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { FrameStack, type StoryboardClip, StoryboardPlayer } from '#components';
import { meta } from '#meta';
import { Frame, MediaArtifact, Storyboard, type Variant } from '#types';

import { FrameDetail } from './FrameDetail.tsx';
import { FrameThumbnail } from './FrameThumbnail.tsx';

const isArtifact = Obj.instanceOf(MediaArtifact.MediaArtifact);

/** The stack's opening width in rem — the navtree sidebar's (`--dx-nav-sidebar-size`, 350px). */
const STACK_SIZE = 22;
const isFrame = Obj.instanceOf(Frame.Frame);

export type StoryboardArticleProps = AppSurface.ObjectArticleProps<Storyboard.Storyboard>;

/**
 * A storyboard as master/detail: the frames as a reorderable stack of previews on the left, the
 * selected frame's artifact article on the right, and a toolbar whose Append frame opens the
 * artifact create dialog — one gesture makes the artifact, parented to its new frame, and the frame,
 * parented to the storyboard. The same shape a slide deck takes; see the plugin design doc.
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

  // The selected frame, falling back to the first: a deleted or not-yet-loaded selection shows the
  // storyboard's opening frame rather than nothing.
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const selectedFrame = frames.find((frame) => frame.id === selectedId) ?? frames[0];
  useEffect(() => {
    if (selectedFrame && selectedFrame.id !== selectedId) {
      setSelectedId(selectedFrame.id);
    }
  }, [selectedFrame, selectedId]);

  // The create dialog makes the artifact in the space; the frame's ref and parent edge make it the
  // frame's (ref before edge: the frame's `artifact` ref declares the edge).
  const createArtifact = useCallback(async () => {
    const db = Obj.getDatabase(storyboard);
    if (!db) {
      return undefined;
    }
    const { data: ref } = await invokePromise(SpaceOperation.OpenObjectForm, {
      target: db,
      typename: Type.getTypename(MediaArtifact.MediaArtifact),
      navigable: false,
    });
    const artifact = ref?.target;
    return artifact && isArtifact(artifact) ? artifact : undefined;
  }, [storyboard, invokePromise]);

  const handleAppend = useCallback(async () => {
    const artifact = await createArtifact();
    if (!artifact) {
      return;
    }
    const frame = Storyboard.appendFrame(storyboard, Frame.make({ name: artifact.name, artifact }));
    Obj.setParent(artifact, frame);
    setSelectedId(frame.id);
  }, [storyboard, createArtifact]);

  // A frame made without an artifact (an agent's generic create, a cleared ref) gets one here.
  const handleAddArtifact = useCallback(
    async (frame: Frame.Frame) => {
      const artifact = await createArtifact();
      if (!artifact) {
        return;
      }
      Obj.update(frame, (frame) => {
        frame.artifact = Ref.make(artifact);
      });
      Obj.setParent(artifact, frame);
    },
    [createArtifact],
  );

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
        .action(
          'delete-frame',
          {
            label: ['delete-frame.label', { ns: meta.profile.key }],
            icon: 'ph--trash--regular',
            disposition: 'toolbar',
            disabled: !selectedFrame,
          },
          () => selectedFrame && handleDelete(selectedFrame),
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
    [handleAppend, handleDelete, selectedFrame, playing, clips.length],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Toolbar>
      {playing ? (
        <Panel.Content>
          <StoryboardPlayer clips={clips} onClose={() => setPlaying(false)} />
        </Panel.Content>
      ) : frames.length === 0 ? (
        <Panel.Content>
          <Empty classNames='h-full' label={t('storyboard-empty.message')} />
        </Panel.Content>
      ) : (
        // Master/detail: the stack opens at a navtree sidebar's width so previews read at that
        // scale, and the handle lets the reader trade it against the article.
        <Panel.Content asChild>
          <Splitter.Root orientation='horizontal' anchor='start' resizable defaultSize={STACK_SIZE} minSize={8}>
            <Splitter.Panel position='start'>
              <ScrollArea.Root>
                <ScrollArea.Viewport>
                  <FrameStack<Frame.Frame>
                    items={frames}
                    selectedId={selectedFrame?.id}
                    onSelect={setSelectedId}
                    onMove={handleMove}
                  >
                    {(frame, index) => <FrameThumbnail frame={frame} index={index} />}
                  </FrameStack>
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            </Splitter.Panel>
            <Splitter.Handle />
            <Splitter.Panel position='end'>
              {selectedFrame && (
                <FrameDetail
                  key={selectedFrame.id}
                  frame={selectedFrame}
                  attendableId={attendableId}
                  onAddArtifact={handleAddArtifact}
                />
              )}
            </Splitter.Panel>
          </Splitter.Root>
        </Panel.Content>
      )}
    </Panel.Root>
  );
};

StoryboardArticle.displayName = 'StoryboardArticle';
