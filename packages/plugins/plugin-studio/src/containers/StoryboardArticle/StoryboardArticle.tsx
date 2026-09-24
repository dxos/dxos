//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Panel, ScrollArea, Splitter, useTranslation } from '@dxos/react-ui';
import { Attention, useSelection, useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { Empty } from '@dxos/react-ui-list';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { FrameStack, StoryboardPlayer } from '#components';
import { meta } from '#meta';
import { Frame, MediaArtifact, Storyboard, StoryboardView } from '#types';

import { FRAME_COMPANION } from '../../constants.ts';
import { EmptyPanel } from './EmptyPanel.tsx';
import { FrameThumbnail } from './FrameThumbnail.tsx';
import { FrameVariants } from './FrameVariants.tsx';

const isArtifact = Obj.instanceOf(MediaArtifact.MediaArtifact);

/** The stack's opening width in rem — the navtree sidebar's (`--dx-nav-sidebar-size`, 350px). */
const STACK_SIZE = 18;
const isFrame = Obj.instanceOf(Frame.Frame);

export type StoryboardArticleProps = AppSurface.ObjectArticleProps<Storyboard.Storyboard>;

/**
 * A storyboard as master/detail: the frames as a reorderable stack of previews on the left and the
 * selected frame's produced variants (the All gallery, or one variant played) on the right; the
 * frame's request form lives in the plank's frame companion, which picking a frame opens. The toolbar's Append frame opens the artifact create
 * dialog — one gesture makes the artifact, parented to its new frame, and the frame, parented to
 * the storyboard. The same shape a slide deck takes; see the plugin design doc.
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

  // The playlist and the playing flag are shared with the storyboard's Play graph action, which
  // is what the main panel's toolbar renders; closing the player flips the flag back here.
  const clipsAtom = useMemo(() => StoryboardView.clipsAtom(storyboard), [storyboard]);
  const clips = useAtomValue(clipsAtom);
  const { playing } = useViewState(StoryboardView.aspect, storyboard.id);
  const { update: updateView } = useViewStateActions(StoryboardView.aspect, storyboard.id);
  const handleStop = useCallback(() => updateView((prev) => ({ ...prev, playing: false })), [updateView]);

  // The selection is the plank's (attention view state), so the frame companion follows it; it
  // falls back to the first frame so a deleted or not-yet-loaded selection shows the opening frame.
  const selectedId = useSelection(attendableId, 'single');
  const selectedFrame = frames.find((frame) => frame.id === selectedId) ?? frames[0];
  const showItem = useShowItem();
  const handleSelect = useCallback(
    (id: string) => {
      if (!attendableId) {
        return;
      }
      // Select, then open the frame companion on this plank.
      void showItem({ contextId: attendableId, selectionId: id, companion: Attention.linkedSegment(FRAME_COMPANION) });
    },
    [attendableId, showItem],
  );

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
    handleSelect(frame.id);
  }, [storyboard, createArtifact, handleSelect]);

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
        .build(),
    [handleAppend, handleDelete, selectedFrame],
  );

  return (
    // The splitter is the article: the stack (with the storyboard's toolbar) opens at a navtree
    // sidebar's width so previews read at that scale, and the handle lets the reader trade it
    // against the main panel — the selected frame's variants, or the storyboard playing.
    <Splitter.Root role={role} orientation='horizontal' anchor='start' resizable defaultSize={STACK_SIZE} minSize={8}>
      <Splitter.Panel position='start'>
        <Panel.Root>
          <Panel.Toolbar asChild>
            <ActionToolbar {...menuActions} attendableId={attendableId} />
          </Panel.Toolbar>
          <Panel.Content asChild>
            <ScrollArea.Root>
              <ScrollArea.Viewport>
                {frames.length === 0 ? (
                  <Empty classNames='h-full' label={t('storyboard-empty.message')} />
                ) : (
                  <FrameStack<Frame.Frame>
                    items={frames}
                    selectedId={selectedFrame?.id}
                    onSelect={handleSelect}
                    onMove={handleMove}
                  >
                    {(frame, index) => <FrameThumbnail frame={frame} index={index} />}
                  </FrameStack>
                )}
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Panel.Content>
        </Panel.Root>
      </Splitter.Panel>
      <Splitter.Handle />
      <Splitter.Panel position='end'>
        {playing ? (
          <StoryboardPlayer clips={clips} attendableId={attendableId} onClose={handleStop} />
        ) : selectedFrame ? (
          <FrameVariants key={selectedFrame.id} frame={selectedFrame} attendableId={attendableId} />
        ) : (
          <EmptyPanel label={t('storyboard-empty.message')} attendableId={attendableId} />
        )}
      </Splitter.Panel>
    </Splitter.Root>
  );
};

StoryboardArticle.displayName = 'StoryboardArticle';
