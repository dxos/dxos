//
// Copyright 2026 DXOS.org
//

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Chat from '@dxos/assistant/Chat';
import { addressFromA1Notation, addressToA1Notation } from '@dxos/compute-hyperformula';
import { Collection, Feed, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import {
  DIAGRAM_COMMANDS,
  diagramFiles,
  echoDiagrams,
  loadDiagramDrawings,
  makeEchoBenchmarks,
  makeEchoDesign,
} from '@dxos/plugin-canvas/Architecture';
import * as CanvasPlugin from '@dxos/plugin-canvas/CanvasPlugin';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as Presentation from '@dxos/plugin-presenter/Presentation';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/testing';
import * as Sheet from '@dxos/plugin-sheet/Sheet';
import * as SheetPlugin from '@dxos/plugin-sheet/SheetPlugin';
import * as SheetUtil from '@dxos/plugin-sheet/SheetUtil';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { Message } from '@dxos/types';

import { type ActorFlow, type ActorSpec, type ActorStep } from '../actors/index.ts';

const DOCUMENT = 'ECHO design';
const SHEET = 'ECHO benchmarks';
const ROADMAP_CHAT = 'Roadmap ideas';
const WORDING_CHAT = 'Security wording';

/** The diagrams the canvas builders draw, by the drawing name the template gives each. */
const DIAGRAMS = { 'echo-model': 'ECHO data model', 'echo-sync': 'ECHO replication', 'echo-query': 'ECHO queries' };

/** One paragraph-level block of the target document: a heading, an embed line, or text someone writes. */
type Block = { text: string; kind: 'heading' | 'embed' | 'text'; chapter: number };

/** What the scene builds towards: the template's own design document, diagrams and sheet, before they were stripped. */
export type EchoTarget = {
  blocks: Block[];
  /** Per drawing name, the records the outline removed (boxes first, then arrows), in build order. */
  records: Record<string, [key: string, record: unknown][]>;
  /** The benchmark rows the outline removed, as `[A1 address, value]` in row order. */
  cells: [address: string, value: unknown][];
};

/** Splits the document into blocks; joining their text with blank lines gives it back exactly. */
export const blocksOf = (content: string): Block[] => {
  let chapter = 0;
  return content.split('\n\n').map((text) => {
    if (/^## \d+\./.test(text)) {
      chapter = Number(/^## (\d+)\./.exec(text)?.[1]);
    }
    const kind = text.startsWith('#') ? 'heading' : /^!\[[^\]]*\]\(echo:/.test(text) ? 'embed' : 'text';
    return { text, kind, chapter };
  });
};

/** The outline: the title, the introduction, every heading and every embed; chapter text is left to the writers. */
export const outlineOf = (blocks: Block[]): string =>
  blocks
    .filter(({ kind, chapter }) => kind !== 'text' || chapter === 0)
    .map(({ text }) => text)
    .join('\n\n');

/**
 * The first drafts chapter 6's writer types where the finished document has tighter wording; Pia applies the
 * assistant's suggested edits, which turn each draft into the finished phrase.
 */
const DRAFTS: Record<string, string> = {
  'is a chain of signed credentials rooted in the identity that created it':
    'is made of credentials, each one signed, that chain back to the identity that created it',
  'a stolen URL or an unauthorized device gets nothing':
    'neither a stolen URL nor an unauthorized device can get any data',
};

const draft = (text: string): string =>
  Object.entries(DRAFTS).reduce((drafted, [finished, first]) => drafted.replace(finished, first), text);

/** Whether a canvas record is a group's dashed frame (a node styled as a guide) rather than a box. */
const isGroupFrame = (record: unknown): boolean => {
  const node = typeof record === 'object' && record !== null && 'node' in record ? record.node : undefined;
  const style = typeof node === 'object' && node !== null && 'style' in node ? node.style : undefined;
  return typeof style === 'object' && style !== null && 'guide' in style && style.guide === true;
};

/** Seeds the DXOS Architecture template, then strips its ECHO design document, diagrams and sheet back to the outline. */
const seed: ActorFlow<EchoTarget>['seed'] = async ({ space }) => {
  // The template's own builders, for just the objects the scene works on: the whole template would take its guests
  // too long to replicate. The replication diagram's AutomergeHost box drills into echo-host, so that comes too.
  const set = echoDiagrams({
    ...diagramFiles(DIAGRAM_COMMANDS, 'echo'),
    'composer-echo': DIAGRAM_COMMANDS['composer-echo'],
  });
  const drawings = await loadDiagramDrawings(space.db, {
    ...set,
    names: { ...set.names, 'composer-echo': 'echo-host' },
  });
  const embedded = Object.fromEntries(Object.keys(DIAGRAMS).map((id) => [id, drawings.get(id)]));
  const benchmarks = space.db.add(makeEchoBenchmarks());
  const [model, sync, query] = Object.keys(DIAGRAMS).map((id) => embedded[id]);
  invariant(model && sync && query, 'the ECHO diagrams did not load');
  const design = space.db.add(
    makeEchoDesign({ 'echo-model': model, 'echo-sync': sync, 'echo-query': query, 'echo-benchmarks': benchmarks }),
  );
  await space.db.flush({ indexes: true });

  const text = await design.content.load();
  const blocks = blocksOf(text.content);
  Obj.update(text, (text) => {
    text.content = outlineOf(blocks);
  });

  const records: EchoTarget['records'] = {};
  for (const [id, name] of Object.entries(DIAGRAMS)) {
    const drawing = drawings.get(id);
    invariant(drawing, `no ${id} drawing`);
    const canvas = await drawing.canvas.load();
    const entries = Object.entries(canvas.content).filter(([key, record]) => {
      // Group frames stay, so the empty diagram shows its sections from the start.
      return (key.startsWith('node:') && !isGroupFrame(record)) || key.startsWith('link:');
    });
    records[name] = [
      ...entries.filter(([key]) => key.startsWith('node:')),
      ...entries.filter(([key]) => key.startsWith('link:')),
    ];
    Obj.update(canvas, (canvas) => {
      for (const [key] of entries) {
        delete canvas.content[key];
      }
    });
  }

  const sheet = benchmarks;
  const cells: EchoTarget['cells'] = [];
  for (let row = 1; row < sheet.rows.length; row++) {
    for (let col = 0; col < sheet.columns.length; col++) {
      const index = SheetUtil.addressToIndex(sheet, { row, col });
      cells.push([addressToA1Notation({ row, col }), sheet.cells[index]?.value]);
    }
  }
  Obj.update(sheet, (sheet) => {
    for (const [address] of cells) {
      delete sheet.cells[SheetUtil.addressToIndex(sheet, addressFromA1Notation(address))];
    }
  });

  for (const name of [ROADMAP_CHAT, WORDING_CHAT]) {
    space.db.add(Chat.make({ name, feed: Ref.make(space.db.add(Feed.make())) }));
  }
  await space.db.flush({ indexes: true });
  return { blocks, records, cells };
};

/** Chapter writers: who writes each chapter and when they start, a few seconds apart. */
const WRITERS: { chapter: number; actor: number; start: number }[] = [
  { chapter: 1, actor: 0, start: 1_000 },
  { chapter: 2, actor: 1, start: 4_000 },
  { chapter: 3, actor: 3, start: 9_000 },
  { chapter: 4, actor: 4, start: 2_500 },
  { chapter: 5, actor: 6, start: 12_000 },
  { chapter: 6, actor: 8, start: 6_000 },
  { chapter: 7, actor: 9, start: 500 },
  { chapter: 8, actor: 11, start: 20_000 },
];

const WRITER_CPS = 30;

/** Deterministic pause after each chunk of a block: one to three seconds, varying by chapter and chunk. */
const chunkPause = (chapter: number, chunk: number) => 1_000 + ((chapter * 7 + chunk * 13) % 10) * 200;

const writing = (): ActorStep<EchoTarget>[] =>
  WRITERS.map(({ chapter, actor: index, start }) => ({
    actor: index,
    name: `Chapter ${chapter}`,
    run: async ({ actor, target }) => {
      const { blocks } = target;
      const heading = blocks.find((block) => block.kind === 'heading' && block.chapter === chapter);
      invariant(heading, `no chapter ${chapter}`);
      await actor.pause(start);
      await actor.pin(heading.text);
      for (const [position, block] of blocks.entries()) {
        if (block.kind !== 'text' || block.chapter !== chapter) {
          continue;
        }
        // Each block goes after the one before it in the finished document, as typed so far.
        const previous = blocks[position - 1];
        await actor.moveTo({ after: previous.chapter === 6 ? draft(previous.text) : previous.text });
        const text = chapter === 6 ? draft(block.text) : block.text;
        // A pause after each sentence and list item, so writers stop and start at their own times.
        const chunks = `\n\n${text}`.split(/(?<=[.:] )|(?<=\n)(?!\n)/);
        for (const [chunk, part] of chunks.entries()) {
          await actor.type(part, { cps: WRITER_CPS });
          await actor.pause(chunkPause(chapter, chunk));
        }
      }
    },
  }));

/** Canvas builders: each adds its diagram's boxes, then its arrows. */
const BUILDERS: { actor: number; drawing: string; start: number }[] = [
  { actor: 2, drawing: DIAGRAMS['echo-model'], start: 3_000 },
  { actor: 5, drawing: DIAGRAMS['echo-sync'], start: 7_000 },
  { actor: 7, drawing: DIAGRAMS['echo-query'], start: 11_000 },
];

const building = (): ActorStep<EchoTarget>[] =>
  BUILDERS.map(({ actor: index, drawing, start }) => ({
    actor: index,
    name: drawing,
    run: async ({ actor, target }) => {
      await actor.pause(start);
      for (const [key, record] of target.records[drawing] ?? []) {
        await actor.addRecord(drawing, key, record, key.startsWith('node:') ? 1_400 : 900);
      }
    },
  }));

/** The cold full-text row, which misses its target: columns A to D of row 9 (zero-based row 8). */
const COLD_ROW = '0,8,3,8';

const filling: ActorStep<EchoTarget> = {
  actor: 10,
  name: 'Benchmarks',
  run: async ({ actor, target }) => {
    await actor.pause(10_000);
    for (const [address, value] of target.cells) {
      await actor.setCell(SHEET, address, value, address.startsWith('D') ? 1_100 : 350);
    }
  },
};

const ROADMAP_REPLY =
  'Four themes stand out. Partial replication, so large spaces open on phones. A schema registry for shared, ' +
  'versioned types. Fine-grained permissions on the same credential chain. And query federation across spaces.';

const WORDING_REPLY =
  'Two edits tighten chapter 6. Say membership "is a chain of signed credentials rooted in the identity that ' +
  'created it", and end with "a stolen URL or an unauthorized device gets nothing".';

/** Each assistant user's scripted replies, in turn. */
const SCRIPTS: Record<string, string[]> = {
  Omar: [ROADMAP_REPLY],
  Pia: [WORDING_REPLY],
};

const reviewing = (): ActorStep<EchoTarget>[] => [
  {
    actor: 12,
    name: 'Review',
    run: async ({ actor }) => {
      await actor.pause(26_000);
      await actor.waitFor('make the graph lazy');
      await actor.comment('lazy', 'Does a ref subscribe to its target as soon as it resolves?');
      await actor.pause(4_000);
      await actor.waitFor('Subduction service');
      await actor.comment('Subduction service', 'Is this the same Subduction the EDGE diagrams show?');
      await actor.pause(4_000);
      await actor.commentOn(DIAGRAMS['echo-sync'], 'Show which side of the swarm EDGE sits on.');
    },
  },
  {
    actor: 13,
    name: 'Benchmarks review',
    run: async ({ actor }) => {
      await actor.pause(30_000);
      await actor.commentOn(SHEET, 'Cold full-text misses its target by 280 ms.', COLD_ROW);
    },
  },
  {
    actor: 1,
    name: 'Answer',
    run: async ({ actor }) => {
      await actor.pause(1_500);
      await actor.reply('lazy', 'Yes, and it lets go of it once nothing reads it.');
    },
  },
  {
    actor: 4,
    name: 'Answer',
    run: async ({ actor }) => {
      await actor.pause(1_500);
      await actor.reply('Subduction service', 'The same one: it runs inside db-service.');
    },
  },
  {
    actor: 9,
    name: 'Answer',
    run: async ({ actor }) => {
      await actor.pause(2_000);
      await actor.reply({ anchor: COLD_ROW }, 'We warm the index when a space opens, from the next release.');
    },
  },
];

const assisting = (): ActorStep<EchoTarget>[] => [
  {
    actor: 14,
    name: 'Roadmap ideas',
    run: async ({ actor }) => {
      await actor.pause(8_000);
      await actor.ask('What should the ECHO roadmap cover next?', 'query federation across spaces');
    },
  },
  {
    actor: 15,
    name: 'Security wording',
    run: async ({ actor }) => {
      await actor.pause(14_000);
      await actor.ask('Tighten the wording of chapter 6 of the ECHO design.', 'gets nothing');
      // The assistant's edits land in the document once Iris has written both drafts.
      for (const [finished, first] of Object.entries(DRAFTS)) {
        await actor.pause(2_000);
        await waitForText(actor, first);
        await actor.edit(DOCUMENT, first, finished, 2_500);
      }
    },
  },
];

/** Waits until the document, as the actor's client holds it, contains `text`. */
const waitForText = async (actor: Parameters<ActorStep<EchoTarget>['run']>[0]['actor'], text: string) => {
  const document = actor.binding.object(DOCUMENT);
  invariant(Obj.instanceOf(Markdown.Document, document), 'no design document');
  const content = await document.content.load();
  await actor.until(() => content.content.includes(text), `"${text}"`, { timeout: 120_000 });
};

/** A scripted assistant: the model replies with each line in turn, split into words so the reply streams in. */
const scriptedAssistant = (replies: string[]) =>
  ScriptedLanguageModel.scriptedAiServiceMiddleware(
    replies.map((reply) => ({ parts: reply.split(/(?<= )/).map((word) => ScriptedLanguageModel.text(word)) })),
  );

const ACTORS: ActorSpec[] = [
  { name: 'Ada', hue: 'blue' },
  { name: 'Ben', hue: 'amber' },
  { name: 'Cleo', hue: 'emerald', subject: DIAGRAMS['echo-model'] },
  { name: 'Dev', hue: 'rose' },
  { name: 'Eve', hue: 'violet' },
  { name: 'Finn', hue: 'orange', subject: DIAGRAMS['echo-sync'] },
  { name: 'Gia', hue: 'teal' },
  { name: 'Hugo', hue: 'indigo', subject: DIAGRAMS['echo-query'] },
  { name: 'Iris', hue: 'pink' },
  { name: 'Jon', hue: 'lime' },
  { name: 'Kai', hue: 'cyan', subject: SHEET },
  { name: 'Lena', hue: 'red' },
  { name: 'Milo', hue: 'purple', companions: ['comments'] },
  { name: 'Nia', hue: 'sky', subject: SHEET, companions: ['comments'] },
  { name: 'Omar', hue: 'yellow', subject: ROADMAP_CHAT },
  { name: 'Pia', hue: 'fuchsia', subject: WORDING_CHAT },
];

/**
 * Sixteen people build the ECHO design document of the DXOS Architecture template from its outline: eight writers
 * (one chapter each), three canvas builders, one sheet filler, two reviewers whose threads the writers answer, and
 * two assistant users, one of whom applies the assistant's edits. Plan: `.agents/projects/multi-actor/ECHO-SCENE.md`.
 */
export const echoFlow: ActorFlow<EchoTarget> = {
  actors: ACTORS,
  document: { name: DOCUMENT },
  seed,
  types: [
    Drawing.Drawing,
    Drawing.Canvas,
    Presentation.Presentation,
    Presentation.Slide,
    Sheet.Sheet,
    Sheet.Chart,
    Collection.Collection,
    Chat.Chat,
    Feed.Feed,
    Message.Message,
  ],
  plugins: ({ name }) => [
    IllustratorPlugin.make(),
    CanvasPlugin.make(),
    SheetPlugin.make(),
    ...(SCRIPTS[name]
      ? [
          RoutinePlugin(),
          AssistantPlugin.make({ aiServiceMiddleware: scriptedAssistant(SCRIPTS[name]) }),
          PreviewPlugin.make(),
          TasksPlugin.make(),
        ]
      : []),
  ],
  duration: 78_000,
  steps: [...writing(), ...building(), filling, ...reviewing(), ...assisting()],
};
