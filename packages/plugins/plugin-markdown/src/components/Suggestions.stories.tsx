//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Capabilities,
  CollaborationActions,
  IntentPlugin,
  type PluginMeta,
  SettingsPlugin,
  Surface,
  contributes,
  createIntent,
  definePlugin,
  useCapability,
  useIntentDispatcher,
  Events,
  defineModule,
  createResolver,
  LayoutAction,
  defineCapability,
} from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Message } from '@dxos/artifact';
import { S, AST, create, type Expando, EchoObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { live, makeRef, refFromDXN } from '@dxos/live-object';
import { ClientPlugin } from '@dxos/plugin-client';
import { SpacePlugin } from '@dxos/plugin-space';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { randomQueueDxn, useQueue, useSpace } from '@dxos/react-client/echo';
import { IconButton, Popover, Toolbar } from '@dxos/react-ui';
import { command, useTextEditor } from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';
import { defaultTx } from '@dxos/react-ui-theme';
import { withLayout } from '@dxos/storybook-utils';

import MarkdownContainer from './MarkdownContainer';
import { MarkdownPlugin } from '../MarkdownPlugin';
import { MarkdownCapabilities } from '../capabilities';
import { MARKDOWN_PLUGIN } from '../meta';
import translations from '../translations';
import { createDocument, DocumentType, type MarkdownSettingsProps } from '../types';

faker.seed(1);

// TODO(wittjosiah): Factor out.
//   Cannot go in storybook-utils because it creates a circular dependency.
//   Cannot go in app-framework because it exports react-ui components.
const layoutMeta: PluginMeta = {
  id: 'dxos.org/plugin/storybook-layout',
  name: 'Storybook Layout',
};

type LayoutState = {
  popoverContent?: any;
  popoverOpen?: boolean;
  popoverSide?: 'top' | 'right' | 'bottom' | 'left';
  popoverVariant?: 'virtual' | 'react';
  popoverAnchor?: HTMLButtonElement;
  popoverAnchorId?: string;
};
const LayoutState = defineCapability<LayoutState>('dxos.org/plugin/storybook-layout/state');

const LayoutPlugin = () =>
  definePlugin(layoutMeta, [
    defineModule({
      id: `${layoutMeta.id}/state`,
      activatesOn: Events.Startup,
      activate: () => {
        const state = live<LayoutState>({});

        const layout = live<Capabilities.Layout>({
          get mode() {
            return 'storybook';
          },
          get dialogOpen() {
            return false;
          },
          get sidebarOpen() {
            return false;
          },
          get complementarySidebarOpen() {
            return false;
          },
          get workspace() {
            return 'default';
          },
          get active() {
            return [];
          },
          get inactive() {
            return [];
          },
          get scrollIntoView() {
            return undefined;
          },
        });

        return [contributes(LayoutState, state), contributes(Capabilities.Layout, layout)];
      },
    }),
    defineModule({
      id: `${layoutMeta.id}/intent-resolver`,
      activatesOn: Events.SetupIntentResolver,
      activate: (context) =>
        contributes(Capabilities.IntentResolver, [
          createResolver({
            intent: LayoutAction.UpdateLayout,
            // TODO(wittjosiah): This should be able to just be `S.is(LayoutAction.UpdatePopover.fields.input)`
            //  but the filter is not being applied correctly.
            filter: (data): data is S.Schema.Type<typeof LayoutAction.UpdatePopover.fields.input> =>
              S.is(LayoutAction.UpdatePopover.fields.input)(data),
            resolve: ({ subject, options }) => {
              const layout = context.requestCapability(LayoutState);
              layout.popoverContent =
                typeof subject === 'string'
                  ? { component: subject, props: options.props }
                  : subject
                    ? { subject }
                    : undefined;
              layout.popoverOpen = options.state ?? Boolean(subject);
              layout.popoverSide = options.side;
              layout.popoverVariant = options.variant;
              if (options.variant === 'virtual') {
                layout.popoverAnchor = options.anchor;
              } else {
                layout.popoverAnchorId = options.anchorId;
              }
            },
          }),
        ]),
    }),
    defineModule({
      id: `${layoutMeta.id}/react-root`,
      activatesOn: Events.Startup,
      activate: () =>
        contributes(Capabilities.ReactContext, {
          id: 'storybook-layout',
          context: ({ children }) => {
            const trigger = useRef<HTMLButtonElement | null>(null);
            const layout = useCapability(LayoutState);

            useEffect(() => {
              trigger.current = layout.popoverAnchor ?? null;
            }, [layout.popoverAnchor]);

            const handlePopoverOpenChange = useCallback(
              (nextOpen: boolean) => {
                if (nextOpen && layout.popoverAnchorId) {
                  layout.popoverOpen = true;
                } else {
                  layout.popoverOpen = false;
                  layout.popoverAnchorId = undefined;
                  layout.popoverSide = undefined;
                }
              },
              [layout],
            );
            const handlePopoverClose = useCallback(() => handlePopoverOpenChange(false), [handlePopoverOpenChange]);

            return (
              <Popover.Root open={layout.popoverOpen} onOpenChange={handlePopoverOpenChange}>
                <Popover.VirtualTrigger virtualRef={trigger} />
                <Popover.Portal>
                  <Popover.Content side={layout.popoverSide} onEscapeKeyDown={handlePopoverClose}>
                    <Popover.Viewport>
                      <Surface role='popover' data={layout.popoverContent} limit={1} />
                    </Popover.Viewport>
                    <Popover.Arrow />
                  </Popover.Content>
                </Popover.Portal>
                {children}
              </Popover.Root>
            );
          },
        }),
    }),
  ]);

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

const TestChat: FC<{ doc: DocumentType; content: string }> = ({ doc, content }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { parentRef } = useTextEditor({ initialValue: content });

  const space = useSpace();
  const queueDxn = useMemo(() => space && randomQueueDxn(space.id), [space]);
  const queue = useQueue<Message>(queueDxn);

  const handleInsert = () => {
    invariant(space);
    invariant(queue);
    queue.append([create(Message, { role: 'assistant', content: [{ type: 'text', text: 'Hello' }] })]);
    const message = queue.items[queue.items.length - 1];

    void dispatch(
      createIntent(CollaborationActions.InsertContent, {
        spaceId: space.id,
        target: makeRef(doc as any as Expando), // TODO(burdon): Comomon base type.
        object: refFromDXN(new DXN(DXN.kind.QUEUE, [...queue.dxn.parts, message.id])),
        label: 'Proposal',
      }),
    );
  };

  return (
    <StackItem.Content toolbar classNames='w-full'>
      <Toolbar.Root classNames='border-be border-separator'>
        <IconButton icon='ph--plus--regular' disabled={!queue} label='Insert' onClick={handleInsert} />
      </Toolbar.Root>
      <div ref={parentRef} className='p-4' />
    </StackItem.Content>
  );
};

const DefaultStory = ({ document, chat }: { document: string; chat: string }) => {
  const space = useSpace();
  const [doc, setDoc] = useState<DocumentType>();
  const settings = useCapability(Capabilities.SettingsStore).getStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN)!.value;

  useEffect(() => {
    if (!space) {
      return undefined;
    }

    const doc = space.db.add(
      createDocument({
        name: 'Test',

        // Create links.
        content: document.replaceAll(/\[(\w+)\]/g, (_, label) => {
          const obj = space.db.add(live(TestItem, { title: label, description: faker.lorem.paragraph() }));
          const dxn = makeRef(obj).dxn.toString();
          return `[${label}][${dxn}]`;
        }),
      }),
    );

    setDoc(doc);
  }, [space]);

  if (!space || !doc) {
    return <></>;
  }

  return (
    <>
      <MarkdownContainer id={doc.id} object={doc} settings={settings} />
      <TestChat doc={doc} content={chat} />
    </>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-markdown/Suggestions',
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: [
        ThemePlugin({ tx: defaultTx }),
        LayoutPlugin(),
        ClientPlugin({
          types: [DocumentType, TestItem],
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
          },
        }),
        SpacePlugin(),
        SettingsPlugin(),
        IntentPlugin(),
        MarkdownPlugin(),
      ],
      capabilities: [contributes(MarkdownCapabilities.Extensions, [() => command()])],
    }),
    withLayout({ tooltips: true, fullscreen: true, classNames: 'grid grid-cols-2' }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = Meta<typeof DefaultStory>;

export const Default: Story = {
  args: {
    chat: 'Hello\n',
    document: [
      '# Test',
      '',
      faker.lorem.paragraph(1),
      '',
      'This is a [DXOS] story that tests [ECHO] references inside the Markdown plugin.',
      '',
      faker.lorem.paragraph(3),
      '',
    ].join('\n'),
  },
};
