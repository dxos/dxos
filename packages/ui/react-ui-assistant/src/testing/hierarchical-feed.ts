//
// Copyright 2026 DXOS.org
//

import { type ContentBlock, Message } from '@dxos/types';

import { type ForkMarker, type ThreadLane, laneTag } from '../types.ts';

export type HierarchicalFeed = {
  /** In feed order, so the rows of lanes running at once interleave. */
  readonly messages: readonly Message.Message[];
  /** The lane of each message shown in full, by message id. */
  readonly lanes: ReadonlyMap<string, ThreadLane>;
  /** The forks that start at each message, by message id. */
  readonly forks: ReadonlyMap<string, readonly ForkMarker[]>;
  /** The same work before any lane became a card: every row in feed order, each lane's rows named by `lanes`. */
  readonly threads: {
    readonly messages: readonly Message.Message[];
    readonly lanes: ReadonlyMap<string, ThreadLane>;
  };
};

// Recent, since a lane's header shows how long it has been running.
const LANE_AGE = 4 * 60_000;

type ToolRun = { name: string; input: string; result: string };

type Turn = { reasoning?: string; tools?: readonly ToolRun[]; text: string; name?: string };

const prompt = (text: string) =>
  Message.make({ sender: { role: 'user', name: 'Rich' }, blocks: [{ _tag: 'text', text }] });

/**
 * A main thread and what branches off it: two forks, three lanes in full and one in the background, shown as a card.
 * The lanes interleave as they do in a feed. The pricing lane finishes and converges: its gutter ends, the main thread
 * answers from its result, and the other lanes carry on below that answer.
 */
export const createHierarchicalFeed = (): HierarchicalFeed => {
  const started = new Date(Date.now() - LANE_AGE).toISOString();

  let nextCall = 0;
  const answer = ({ reasoning, tools = [], text, name }: Turn) => {
    const blocks: ContentBlock.Any[] = [
      ...(reasoning ? [{ _tag: 'reasoning' as const, reasoningText: reasoning }] : []),
      ...tools.flatMap((tool): ContentBlock.Any[] => {
        const toolCallId = `call-${++nextCall}`;
        return [
          {
            _tag: 'toolCall',
            toolCallId,
            name: tool.name,
            input: JSON.stringify({ query: tool.input }),
            providerExecuted: false,
          },
          { _tag: 'toolResult', toolCallId, name: tool.name, result: tool.result, providerExecuted: false },
        ];
      }),
      { _tag: 'text', text },
    ];
    return Message.make({ sender: { role: 'assistant', name }, blocks });
  };

  const opening = [
    prompt('Plan the beta launch.'),
    answer({
      tools: [
        { name: 'search', input: 'beta launch plan', result: 'Found the launch brief and the release checklist.' },
      ],
      text: 'The launch depends on three things: the announcement, the API freeze and the pricing page.',
    }),
  ];

  const announcement = {
    prompt: prompt('Draft the announcement.'),
    research: answer({
      reasoning: 'The announcement must name the date and who is invited, so I will read the brief first.',
      tools: [{ name: 'read_document', input: 'launch brief', result: 'The beta opens on Friday for current users.' }],
      text: 'The brief gives the date and the audience. I am writing the first draft now.',
    }),
    draft: answer({
      tools: [{ name: 'write_document', input: 'announcement draft', result: 'Saved the draft, 180 words.' }],
      text: 'Here is a first draft: the beta opens on Friday, and every current user is invited.',
    }),
    followUp: prompt('Make it shorter, and mention the pricing limits.'),
    revision: answer({
      reasoning: 'The limits come from the pricing review, which has now finished.',
      tools: [{ name: 'write_document', input: 'announcement revision', result: 'Saved the revision, 90 words.' }],
      text: 'I have cut the draft in half and I am adding the limits now.',
    }),
  };

  const freeze = {
    prompt: prompt('Check that the API freeze holds.'),
    audit: answer({
      reasoning: 'A freeze holds only if nothing is still open against the public API.',
      tools: [
        { name: 'search', input: 'open API changes', result: 'Two changes are open against the public API.' },
        { name: 'read_document', input: 'freeze policy', result: 'Changes may land only with a release note.' },
      ],
      text: 'Two changes are still open, and each one needs a release note.',
    }),
    notes: answer({
      tools: [{ name: 'read_document', input: 'release notes', result: 'One of the two changes has a release note.' }],
      text: 'One change has its note. The other note belongs in the announcement, so I am waiting for that draft.',
    }),
  };

  const pricing = {
    prompt: prompt('Review the pricing page.'),
    review: answer({
      name: 'Reviewer',
      reasoning: 'I will compare the published limits with the limits the API enforces.',
      tools: [
        { name: 'read_document', input: 'pricing page', result: 'The page publishes three plans and their limits.' },
      ],
      text: 'The page matches the plan so far. I am now comparing its limits with the API.',
    }),
    compare: answer({
      name: 'Reviewer',
      tools: [{ name: 'search', input: 'API rate limits', result: 'The enforced limits match all three plans.' }],
      text: 'The enforced limits match all three published plans.',
    }),
    result: answer({
      name: 'Reviewer',
      text: 'Review finished: the pricing page is correct, and it needs no change before the launch.',
    }),
  };

  const signups: ThreadLane = {
    id: 'signups',
    hue: 'fuchsia',
    title: 'Collect beta sign-ups',
    status: 'running',
    started,
  };
  const card = answer({
    text: laneTag([
      {
        lane: signups,
        lines: [
          { role: 'user', name: 'Rich', text: 'Collect the beta sign-ups from the form.' },
          { role: 'tool', text: '→ read_document' },
          { role: 'assistant', text: 'The form has about 300 responses.' },
          { role: 'tool', text: '→ search' },
          { role: 'assistant', text: 'I have read 120 responses and removed 8 duplicates.' },
        ],
      },
    ]),
  });
  const signupRows = [
    prompt('Collect the beta sign-ups from the form.'),
    answer({
      tools: [{ name: 'read_document', input: 'sign-up form', result: 'The form has about 300 responses.' }],
      text: 'The form has about 300 responses.',
    }),
    answer({
      tools: [{ name: 'search', input: 'duplicate sign-ups', result: 'Found 8 duplicates so far.' }],
      text: 'I have read 120 responses and removed 8 duplicates.',
    }),
  ];

  const closingPrompt = prompt('Where does that leave the launch?');
  const closingAnswer = answer({
    text: 'The pricing review has finished, so that risk is closed. Friday still holds if the last release note lands.',
  });

  const lanes = new Map<string, ThreadLane>();
  const addLane = (
    { prompt: first, ...rest }: { prompt: Message.Message } & Record<string, Message.Message>,
    lane: Omit<ThreadLane, 'first' | 'started'>,
  ) => {
    for (const { id } of [first, ...Object.values(rest)]) {
      lanes.set(id, { ...lane, started, first: first.id });
    }
  };
  addLane(announcement, { id: 'announcement', hue: 'sky', title: 'Draft the announcement', status: 'running' });
  addLane(freeze, {
    id: 'freeze',
    hue: 'amber',
    title: 'Check the API freeze',
    status: 'waiting',
    waitingOn: { hue: 'sky', title: 'Draft the announcement' },
  });
  addLane(pricing, {
    id: 'pricing',
    hue: 'emerald',
    title: 'Review the pricing page',
    owner: 'Reviewer',
    status: 'done',
  });

  const forks = new Map<string, readonly ForkMarker[]>([
    [opening[1].id, [{ id: 'fork-thursday', label: 'Launch on Thursday' }]],
    [announcement.draft.id, [{ id: 'fork-shorter', label: 'A shorter announcement' }]],
  ]);

  const rows = (background: readonly Message.Message[]) => [
    ...opening,
    announcement.prompt,
    freeze.prompt,
    announcement.research,
    pricing.prompt,
    freeze.audit,
    pricing.review,
    ...background,
    announcement.draft,
    pricing.compare,
    freeze.notes,
    pricing.result,
    closingPrompt,
    closingAnswer,
    announcement.followUp,
    announcement.revision,
  ];

  return {
    messages: rows([card]),
    lanes,
    forks,
    threads: {
      messages: rows(signupRows),
      lanes: new Map([...lanes, ...signupRows.map(({ id }) => [id, { ...signups, first: signupRows[0].id }] as const)]),
    },
  };
};
