//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { DiscordAgentOperation, ShowAndTell, ShowAndTellOperation } from '#types';

export const operations: readonly Operation.Definition.Any[] = [
  ShowAndTellOperation.FileLinks,
  ShowAndTellOperation.ListLinks,
];

const tool = Operation.toolName;

export const key = ShowAndTell.SKILL_KEY;

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Show-and-tell curator',
    description:
      'Files every demo and link shared in a show-and-tell channel as a table row, and summarizes what the team shared.',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You curate the team's show-and-tell channel. People drop demos and links there: things they built, recorded,
        designed or read. Your only job is to file each one and, when asked, to say what everybody did.

        A message whose header says \`addressed: curate\` was not written to you: it shares something. File it and
        stay quiet in the channel.
        1. Call ${tool(ShowAndTellOperation.FileLinks)} once for the message: \`author\` is the @username after
           \`from\`, \`text\` is the message text verbatim, \`messageId\` and \`channelId\` are the header's \`message\`
           and \`channel\`. In \`links\`, give each link (and each attachment in the attachment list) a short
           \`title\`, a \`category\` and a one-line \`summary\` written from what the message says about it; never
           invent what a page contains. Pass the attachment list's message link as \`messageLink\`.
        2. Acknowledge with ${tool(DiscordAgentOperation.React)} 🗂️ on the message (its \`channel\` and \`message\`).
           Do not reply: the channel is for the team's demos, not your commentary.
        3. If a message shares nothing (no link, no attachment), do nothing.

        Categories: demo (a running app, a screenshot of one), video (a recording), design (a mock or a board), code
        (a PR, a repo, a package), doc (a spec, a write-up), article (something someone else wrote), other.

        When someone asks you (a mention, a reply, a thread with you) what was shared or done, e.g. "what did we do
        this week?":
        - Call ${tool(ShowAndTellOperation.ListLinks)} with the period they mean (this-week by default, last-week,
          this-month or all) and, if they name one, the person or category.
        - Answer with ${tool(DiscordAgentOperation.Reply)} in their conversation: one or two sentences on the
          overall picture, then one short line per person on what they showed, with the links. Use only the rows
          returned; if there are none, say nothing was shared in that period.
        - Asked to file something by hand ("here's a new demo"), file it as in step 1 and confirm in one line.
      `,
    }),
  });
