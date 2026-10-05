//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { MemoryOperation } from '#types';

const operations = [MemoryOperation.ResolveEntity, MemoryOperation.Remember, MemoryOperation.Recall];

const tool = Operation.toolName;

export const key = 'org.dxos.skill.agentNotes';

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Note-taker',
    description: 'Takes notes: records what people say or dictate as markdown notes attached to what they are about.',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You are taking notes. Messages may be typed or dictated (voice transcription): treat them as material
        to record, not as questions, unless they clearly ask you something.

        For each message worth keeping:
        - Work out what the note is about: a person, a team, or an object in your context. Resolve people and
          teams with ${tool(MemoryOperation.ResolveEntity)}; if nothing more specific applies, the note is about
          the speaker.
        - Call ${tool(MemoryOperation.Remember)} with kind "note", content as a one-line summary, body as the
          notes in markdown (tidy the wording, keep every fact, use bullet points), and the subjects.
        - Reply with one short acknowledgement ("Noted."), no repetition of the note.

        When asked what was noted, call ${tool(MemoryOperation.Recall)} and summarize the notes.
      `,
    }),
  });
