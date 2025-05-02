//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useState, useMemo, type FC } from 'react';

import { contributes, Capabilities, SettingsPlugin, IntentPlugin, createSurface } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AST, create, EchoObject, getSchema, ObjectId, S } from '@dxos/echo-schema';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { DXN, QueueSubspaceTags, SpaceId } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client';
import { SpacePlugin } from '@dxos/plugin-space';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { resolveRef, useClient } from '@dxos/react-client';
import { live, makeRef, type Queue, type Space, useQueue, useSpace } from '@dxos/react-client/echo';
import { IconButton, Toolbar, useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createRenderer,
  createThemeExtensions,
  decorateMarkdown,
  editorWidth,
  preview,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { Form } from '@dxos/react-ui-form';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { defaultTx, hues, mx } from '@dxos/react-ui-theme';
import { withLayout } from '@dxos/storybook-utils';
import { isNotFalsy } from '@dxos/util';

import { Transcript } from './Transcript';
import { BlockModel } from './model';
import { blockToMarkdown, transcript } from './transcript-extension';
import translations from '../../translations';
import { TranscriptBlock } from '../../types';
import * as TestData from '../../testing/test-data';
import { AIServiceEdgeClient } from '@dxos/assistant';
import { processTranscriptBlock } from '../../entity-extraction';
import { scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { ContactType } from '@dxos/schema';

faker.seed(1);

// TODO(burdon): Reconcile with plugin-markdown.
const TestItem = S.Struct({
  title: S.String.annotations({
    [AST.TitleAnnotationId]: 'Title',
    [AST.DescriptionAnnotationId]: 'Product title',
  }),
  description: S.String.annotations({
    [AST.TitleAnnotationId]: 'Description',
    [AST.DescriptionAnnotationId]: 'Product description',
  }),
}).pipe(EchoObject({ typename: 'dxos.org/type/Test', version: '0.1.0' }));

/**
 * Generator of transcript blocks.
 */
class BlockBuilder {
  static readonly singleton = new BlockBuilder();

  users = Array.from({ length: 5 }, () => ({
    authorName: faker.person.fullName(),
    authorHue: faker.helpers.arrayElement(hues),
  }));

  start = new Date(Date.now() - 24 * 60 * 60 * 10_000);

  constructor(private readonly _space?: Space) {}

  createBlock(numSegments = 1): TranscriptBlock {
    return {
      id: ObjectId.random().toString(),
      ...faker.helpers.arrayElement(this.users),
      segments: Array.from({ length: numSegments }).map(() => this.createSegment()),
    };
  }

  createSegment() {
    let text = faker.lorem.paragraph();
    if (this._space) {
      const label = faker.commerce.productName();
      const obj = this._space.db.add(live(TestItem, { title: label, description: faker.lorem.paragraph() }));
      const dxn = makeRef(obj).dxn.toString();
      const words = text.split(' ');
      words.splice(Math.floor(Math.random() * words.length), 0, `[${label}][${dxn}]`);
      text = words.join(' ');
    }

    return {
      started: this.next(),
      text,
    };
  }

  next() {
    this.start = new Date(this.start.getTime() + Math.random() * 10_000);
    return this.start;
  }
}

class EntityExtractionBlockBuilder {
  aiService = new AIServiceEdgeClient({
    endpoint: AI_SERVICE_ENDPOINT.REMOTE,
  });
  currentBlock: number = 0;

  seedData(space: Space) {
    space.db.graph.schemaRegistry.addSchema([ContactType]);
    // for (const document of TestData.documents) {
    //   const obj = space.db.add(live(Document, document));
    //   const dxn = makeRef(obj).dxn.toString();
    //   document.dxn = dxn;
    // }

    for (const contact of Object.values(TestData.contacts)) {
      space.db.add(contact);
    }
  }

  async createBlock(): Promise<TranscriptBlock> {
    const block = TestData.transcriptBlocks[this.currentBlock];
    this.currentBlock++;
    this.currentBlock = this.currentBlock % TestData.transcriptBlocks.length;

    const { block: enhancedBlock } = await processTranscriptBlock({
      block,
      aiService: this.aiService,
      context: {
        documents: TestData.documents,
        contacts: Object.values(TestData.contacts),
      },
    });
    return enhancedBlock;
  }
}

const randomQueueDXN = (spaceId = SpaceId.random()) =>
  new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, ObjectId.random()]);

/**
 * Test transcriptionqueue.
 */
const useTestTranscriptionQueue = (space: Space | undefined, running = true, interval = 1_000) => {
  const queueDxn = useMemo(() => (space ? randomQueueDXN(space.id) : undefined), [space]);
  const queue = useQueue<TranscriptBlock>(queueDxn);

  const builder = useMemo(() => new BlockBuilder(space), [space]);
  useEffect(() => {
    if (!queue || !running) {
      return;
    }

    const i = setInterval(() => {
      queue.append([create(TranscriptBlock, builder.createBlock(Math.ceil(Math.random() * 3)))]);
    }, interval);
    return () => clearInterval(i);
  }, [queue, running, interval]);

  return queue;
};

/**
 * Test transcription queue.
 */
const useTestTranscriptionQueueWithEntityExtraction = (space: Space | undefined, running = true, interval = 1_000) => {
  const queueDxn = useMemo(() => (space ? randomQueueDXN(space.id) : undefined), [space]);
  const queue = useQueue<TranscriptBlock>(queueDxn);
  const [builder] = useState(() => new EntityExtractionBlockBuilder());

  useEffect(() => {
    if (!queue || !running) {
      return;
    }

    if (space) {
      builder.seedData(space);
    }

    const ctx = new Context();
    scheduleTaskInterval(
      ctx,
      async () => {
        const block = await builder.createBlock();
        queue.append([create(TranscriptBlock, block)]);
      },
      interval,
    );

    return () => {
      ctx.dispose();
    };
  }, [queue, running, interval]);

  return queue;
};

/**
 * Model adapter for a queue.
 */
const useQueueModel = (queue: Queue<TranscriptBlock> | undefined) => {
  const model = useMemo(() => new BlockModel<TranscriptBlock>(blockToMarkdown), [queue]);
  useEffect(() => {
    if (!queue?.items.length) {
      return;
    }

    const block = queue.items[queue.items.length - 1];
    model.appendBlock(block);
  }, [model, queue?.items.length]);
  return model;
};

const Editor: FC<{
  space?: Space;
  model: BlockModel<TranscriptBlock>;
  running: boolean;
  onRunningChange: (running: boolean) => void;
  onReset?: () => void;
}> = ({ space, model, running, onRunningChange, onReset }) => {
  const client = useClient();
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    return {
      extensions: [
        // TODO(burdon): Enable preview.
        createBasicExtensions({ readOnly: true, lineWrapping: true }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode }),
        decorateMarkdown(),
        space &&
          preview({
            onLookup: async ({ label, ref }) => {
              console.log('onLookup', label, ref);
              const dxn = DXN.parse(ref);
              if (!dxn) {
                return null;
              }

              const object = await resolveRef(client, dxn, space);
              return { label, object };
            },
          }),
        transcript({
          model,
          renderButton: createRenderer(({ onClick }) => (
            <IconButton icon='ph--arrow-line-down--regular' iconOnly label='Scroll to bottom' onClick={onClick} />
          )),
        }),
      ].filter(isNotFalsy),
    };
  }, [space, model]);

  return (
    <div className='grid grid-rows-[1fr_40px] grow divide-y divide-separator'>
      <div ref={parentRef} className={mx('flex grow overflow-hidden', editorWidth)} />
      <div className='grid grid-cols-[1fr_16rem] overflow-hidden'>
        <div className='flex items-center'>
          <SyntaxHighlighter language='json' className='text-sm'>
            {JSON.stringify(model.toJSON())}
          </SyntaxHighlighter>
        </div>
        <Toolbar.Root classNames='justify-end'>
          <IconButton
            icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
            label={running ? 'Pause' : 'Start'}
            onClick={() => onRunningChange(!running)}
          />
          {onReset && <IconButton icon='ph--x--regular' label='Reset' onClick={onReset} />}
        </Toolbar.Root>
      </div>
    </div>
  );
};

type StoryProps = {
  blocks: TranscriptBlock[];
};

// TODO(burdon): Remove old component.
const DefaultStory = ({ blocks: initialBlocks = [] }: StoryProps) => {
  const builder = useMemo(() => new BlockBuilder(), []);
  const [blocks, setBlocks] = useState<TranscriptBlock[]>(initialBlocks);
  useEffect(() => {
    const i = setInterval(() => {
      setBlocks((blocks) => [...blocks, builder.createBlock()]);
    }, 1_000);

    return () => clearInterval(i);
  }, []);

  return <Transcript blocks={blocks} />;
};

const ExtensionStory = ({ blocks: initialBlocks = [] }: StoryProps) => {
  const [reset, setReset] = useState({});
  const builder = useMemo(() => new BlockBuilder(), []);
  const model = useMemo(() => new BlockModel<TranscriptBlock>(blockToMarkdown, initialBlocks), [initialBlocks, reset]);
  const [running, setRunning] = useState(true);
  const [currentBlock, setCurrentBlock] = useState<TranscriptBlock | null>(null);
  useEffect(() => {
    if (!running) {
      return;
    }

    if (!currentBlock) {
      const block = builder.createBlock();
      model.appendBlock(block);
      setCurrentBlock(block);
      return;
    }

    const i = setInterval(() => {
      if (currentBlock?.segments.length && currentBlock.segments.length >= 3) {
        setCurrentBlock(null);
        clearInterval(i);
        return;
      }

      currentBlock.segments.push(builder.createSegment());
      model.updateBlock(currentBlock);
    }, 3_000);

    return () => clearInterval(i);
  }, [model, currentBlock, running]);

  const handleReset = () => {
    setCurrentBlock(null);
    setRunning(false);
    setReset({});
  };

  return <Editor model={model} running={running} onRunningChange={setRunning} onReset={handleReset} />;
};

const QueueStory = () => {
  const [running, setRunning] = useState(true);
  const space = useSpace();
  const queue = useTestTranscriptionQueue(space, running, 2_000);
  const model = useQueueModel(queue);

  return <Editor space={space} model={model} running={running} onRunningChange={setRunning} />;
};

const EntityExtractionQueueStory = () => {
  const [running, setRunning] = useState(true);
  const space = useSpace();
  console.log('space', space);
  const queue = useTestTranscriptionQueueWithEntityExtraction(space, running, 2_000);
  const model = useQueueModel(queue);

  return <Editor space={space} model={model} running={running} onRunningChange={setRunning} />;
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-transcription/Transcript',
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: [
        ThemePlugin({ tx: defaultTx }),
        ClientPlugin({
          types: [TestItem],
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
          },
        }),
        SpacePlugin(),
        SettingsPlugin(),
        IntentPlugin(),
      ],
      capabilities: [
        contributes(
          Capabilities.ReactSurface,
          createSurface({
            id: 'preview-test',
            role: 'preview',
            component: ({ data }) => {
              console.log('data', data);
              const schema = getSchema(data);
              if (!schema) {
                return null;
              }

              return <Form schema={schema} values={data} />;
            },
          }),
        ),
      ],
    }),
    withLayout({ tooltips: true, fullscreen: true }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {
  args: {
    // ignoreAttention: true,
    // attendableId: 'story',
    blocks: Array.from({ length: 10 }, () => BlockBuilder.singleton.createBlock()),
  },
};

export const Empty: Story = {
  args: {
    // ignoreAttention: true,
    // attendableId: 'story',
  },
};

export const Extension: Story = {
  render: ExtensionStory,
  args: {
    // ignoreAttention: true,
    // attendableId: 'story',
  },
};

export const WithQueue: Story = {
  render: QueueStory,
  args: {
    // ignoreAttention: true,
    // attendableId: 'story',
  },
};

export const WithEntityExtractionQueue: Story = {
  render: EntityExtractionQueueStory,
  args: {
    // ignoreAttention: true,
    // attendableId: 'story',
  },
};
