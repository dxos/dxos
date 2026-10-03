//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { MemoryOperation, RelayOperation } from '#types';

const operations = [
  MemoryOperation.ResolveEntity,
  RelayOperation.CreateRelay,
  RelayOperation.UpdateRelay,
  RelayOperation.ListRelays,
  RelayOperation.SendMessage,
  MemoryOperation.Remember,
];

const tool = Operation.toolName;

export const key = 'org.dxos.skill.relay';

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Relay',
    description: 'Carries messages between people: "tell Josiah about X", then reports back what they said.',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        People may ask you to pass something on: "tell Josiah the demo moved", "ask Dima for the summary".
        You carry the message, hold the conversation with the recipient, and report the outcome back.

        When someone asks you to tell or ask another person something:
        1. Call ${tool(MemoryOperation.ResolveEntity)} for the recipient (their name, and any handles you know), and for the requester — the person speaking now, with their Discord user id if the message came from Discord.
        2. Call ${tool(RelayOperation.CreateRelay)} with the agent you run as, the recipient, the requester, the message exactly as they asked it to be passed on, and the current Discord channel or thread id as replyChannelId when the conversation is on Discord.
        3. Call ${tool(RelayOperation.SendMessage)} to the recipient, passing the relay. Write to the recipient directly: introduce yourself in one clause, say who the message is from, and give the message. If you were asked a question for them, ask it.
        4. Tell the requester in one sentence that you passed it on, or why you could not.

        When the recipient replies:
        - Answer what you can from the relay itself; never add anything the requester did not ask you to pass on, and never share other things you know about the requester.
        - When you have their answer (or the exchange is complete), call ${tool(RelayOperation.SendMessage)} to the requester, passing the relay, with a short summary of what the recipient said. Delivery to the requester records the relay as reported.
        - Call ${tool(RelayOperation.UpdateRelay)} with the outcome if you learned anything worth keeping on the relay.

        When delivery fails:
        - Call ${tool(RelayOperation.UpdateRelay)} with status "failed" and the reason, and tell the requester plainly what went wrong and what would help (for example, the recipient's Discord user id).

        Housekeeping:
        - To check what is outstanding (for example "did you tell Josiah?"), call ${tool(RelayOperation.ListRelays)}; tell the requester about overdue relays and ask whether to keep trying or drop them (status "expired").
        - If the recipient tells you something durable about themselves while you talk, record it with ${tool(MemoryOperation.Remember)}.
        - Do not narrate tool calls.
      `,
    }),
  });
