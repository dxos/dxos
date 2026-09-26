//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj, Ref, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Banner, useTranslation } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { Frame, MediaArtifact, type Storyboard } from '#types';

import { FrameDetail } from '../StoryboardArticle/FrameDetail.tsx';

const isArtifact = Obj.instanceOf(MediaArtifact.MediaArtifact);
const isFrame = Obj.instanceOf(Frame.Frame);

export type FrameCompanionProps = {
  /** The storyboard the companion sits beside. */
  companionTo: Storyboard.Storyboard;
  /** The storyboard plank's id: the selection context and what the nested article attends through. */
  attendableId?: string;
};

/**
 * The storyboard's frame companion: the selected frame's artifact article (its request form, Generate
 * and variants). Which frame is the plank's single selection, which the stack sets when a frame is
 * picked — so the companion follows the stack without either holding state of its own.
 */
export const FrameCompanion = ({ companionTo: storyboard, attendableId }: FrameCompanionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const selectedId = useSelection(attendableId, 'single');
  const [refs] = useObject(storyboard, 'frames');
  const frameAtom = useMemo(
    () =>
      Atom.make((get) => {
        const frames = (refs ?? [])
          .map((ref) => get(Obj.atomReactive(ref)))
          .filter((frame): frame is Frame.Frame => !!frame && isFrame(frame));
        return frames.find((frame) => frame.id === selectedId) ?? frames[0];
      }),
    [refs, selectedId],
  );
  const frame = useAtomValue(frameAtom);

  // The create dialog makes the artifact in the space; the frame's ref and parent edge make it the
  // frame's (ref before edge: the frame's `artifact` ref declares the edge).
  const handleAddArtifact = useCallback(
    async (frame: Frame.Frame) => {
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
      Obj.update(frame, (frame) => {
        frame.artifact = Ref.make(artifact);
      });
      Obj.setParent(artifact, frame);
    },
    [storyboard, invokePromise],
  );

  if (!frame) {
    return <Banner.Empty classNames='h-full' label={t('storyboard-empty.message')} />;
  }

  return <FrameDetail key={frame.id} frame={frame} attendableId={attendableId} onAddArtifact={handleAddArtifact} />;
};

FrameCompanion.displayName = 'FrameCompanion';
