//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';

import { Obj, type Ref } from '@dxos/echo';
import { ViewState } from '@dxos/react-ui-attention/types';

import * as Frame from './Frame.ts';
import * as MediaArtifact from './MediaArtifact.ts';
import * as Storyboard from './Storyboard.ts';
import type * as Variant from './Variant.ts';

/** Whether a storyboard is playing back rather than showing its selected frame; keyed by the storyboard's id. */
export type StoryboardViewState = {
  readonly playing: boolean;
};

/**
 * Session-only: playback is a view mode, not something to restore on reload. Written by the
 * storyboard's Play graph action and the player's close, read by the article.
 */
export const aspect = ViewState.define<StoryboardViewState>({
  key: 'org.dxos.plugin.studio.storyboard',
  backend: 'memory',
  schema: Schema.Struct({ playing: Schema.Boolean }),
  defaultValue: () => ({ playing: false }),
});

/** One playable frame: the artifact's cover variant. */
export type Clip = {
  id: string;
  name?: string;
  src: string;
  contentType?: string;
};

/**
 * The frames' cover variants, in order, as a playlist — the view-time splice of the storyboard.
 * Shared by the article (what the player plays) and the Play action (enabled only with clips).
 */
export const clipsAtom = (storyboard: Storyboard.Storyboard): Atom.Atom<readonly Clip[]> =>
  Atom.make((get) => {
    const clips: Clip[] = [];
    const { frames } = get(Obj.atom(storyboard));
    for (const ref of frames as readonly Ref.Ref<Frame.Frame>[]) {
      const frame = get(Obj.atomReactive(ref));
      if (!frame || !Obj.instanceOf(Frame.Frame, frame)) {
        continue;
      }
      // A live object's atom yields the same reference on every change, which dedupes away
      // downstream; the snapshot atoms are what re-fire when a cover is set or a variant lands.
      const artifact = frame.artifact ? get(Obj.atomReactive(frame.artifact)) : undefined;
      const artifactSnapshot =
        artifact && Obj.instanceOf(MediaArtifact.MediaArtifact, artifact) ? get(Obj.atom(artifact)) : undefined;
      const cover: Variant.Variant | undefined =
        artifactSnapshot?.cover && artifact ? get(Obj.atomReactive(artifactSnapshot.cover)) : undefined;
      const coverSnapshot = cover ? get(Obj.atom(cover)) : undefined;
      if (coverSnapshot?.url) {
        clips.push({ id: frame.id, name: frame.name, src: coverSnapshot.url, contentType: coverSnapshot.contentType });
      }
    }
    return clips;
  });
