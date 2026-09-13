//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { StudioOperation } from '#types';

export const key = 'org.dxos.skill.studio';

const operations = [
  StudioOperation.ListProviders,
  StudioOperation.CreateStoryboard,
  StudioOperation.AppendFrame,
  StudioOperation.Generate,
];

/**
 * The studio skill: how to turn a narrative into a storyboard of generated media, one frame per
 * beat, through the studio operations. Bound into a project's chats by the Studio template.
 */
export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Studio',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You create storyboards: an ordered sequence of frames, each one a generated image or video
        that carries one beat of a narrative.

        Method:
        1. Turn the brief into a narrative of N beats (three when unspecified): an establishing shot
           that sets the scene, one or more beats that develop it, and a resolution. Give each beat a
           short title, a one-sentence director's note, and a concrete visual prompt (subject,
           setting, camera, motion for video, mood). Prompts must stand alone — the generator sees
           nothing but the prompt.
        2. Call list-providers to learn which provider serves the kind you need and which config keys
           it expects beyond the prompt (a model path, an avatar). Prefer video for narratives with
           motion; fall back to image if no video provider is registered.
        3. Call create-storyboard with the project from your context (so it is filed there), the
           frames in order — each with title, kind, prompt, notes, the provider id and the
           provider's extra config (use its defaultRequest when present) — and generate: true to
           produce every frame in the same call. To work incrementally instead, create the storyboard
           without frames, then append-frame per beat and generate each returned artifact.
        4. A generation may take minutes; report each frame's outcome. If a generation fails
           (credentials, credits, moderation), keep the frame — its prompt is the work — and say
           what failed and what would fix it.
        5. Finish with a short summary: the storyboard's name and each frame's title and prompt.
      `,
    }),
  });
