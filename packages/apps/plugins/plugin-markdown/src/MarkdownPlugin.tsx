//
// Copyright 2023 DXOS.org
//

import { ArticleMedium, type IconProps } from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import { deepSignal } from 'deepsignal';
import React, { type FC, type MutableRefObject, type RefCallback, type Ref, useEffect, useMemo } from 'react';

import { isGraphNode } from '@braneframe/plugin-graph';
import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { ThreadAction } from '@braneframe/plugin-thread';
import { Document as DocumentType, Thread as ThreadType, Folder } from '@braneframe/types';
import {
  type Plugin,
  type PluginDefinition,
  type IntentPluginProvides,
  isObject,
  parseIntentPlugin,
  resolvePlugin,
  LayoutAction,
} from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { SpaceProxy, getSpaceForObject, isTypedObject, type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import {
  type AutocompleteResult,
  type CommentRange,
  type EditorModel,
  type TextEditorRef,
  useTextModel,
} from '@dxos/react-ui-editor';
import { isTileComponentProps } from '@dxos/react-ui-mosaic';
import { nonNullable } from '@dxos/util';

import {
  EditorCard,
  EditorMain,
  EditorMainEmbedded,
  EditorSection,
  MarkdownMainEmpty,
  MarkdownSettings,
  StandaloneMenu,
} from './components';
import type { UseExtensionsOptions } from './components/extensions';
import meta, { MARKDOWN_PLUGIN } from './meta';
import translations from './translations';
import {
  MarkdownAction,
  type MarkdownPluginProvides,
  type MarkdownProperties,
  type MarkdownSettingsProps,
} from './types';
import { getFallbackTitle, isMarkdown, isMarkdownPlaceholder, isMarkdownProperties, markdownPlugins } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Document.name] = Document;

export const isDocument = (data: unknown): data is DocumentType =>
  isTypedObject(data) && DocumentType.schema.typename === data.__typename;

export type MarkdownPluginState = {
  onChange: NonNullable<(text: string) => void>[];
};

export const MarkdownPlugin = (): PluginDefinition<MarkdownPluginProvides> => {
  const settings = new LocalStorageStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN, { viewMode: {}, experimental: false });
  const state = deepSignal<MarkdownPluginState>({ onChange: [] });

  const pluginMutableRef: MutableRefObject<TextEditorRef> = { current: { root: null } };
  const pluginRefCallback: RefCallback<TextEditorRef> = (nextRef: TextEditorRef) => {
    pluginMutableRef.current = { ...nextRef };
  };

  let intentPlugin: Plugin<IntentPluginProvides> | undefined;

  // TODO(burdon): Rationalize EditorMainStandalone vs EditorMainEmbedded, etc.
  //  Should these components be inline or external?
  const EditorMainStandalone: FC<{
    model: EditorModel;
    properties: MarkdownProperties;
  }> = ({ model, properties }) => {
    return (
      <EditorMain
        model={model}
        properties={properties}
        layout='standalone'
        editorMode={settings.values.editorMode}
        editorRefCb={pluginRefCallback}
      />
    );
  };

  // TODO(burdon): Factor out space dependency.
  const getExtensionsConfig = (space?: Space, document?: DocumentType): UseExtensionsOptions => ({
    debug: settings.values.debug,
    experimental: settings.values.experimental,
    // TODO(burdon): Change to passing in config object.
    listener: {
      onChange: (text: string) => {
        state.onChange.forEach((onChange) => onChange(text));
      },
    },
    autocomplete: space && {
      onSearch: (text: string) => {
        // TODO(burdon): Specify filter (e.g., stack).
        const { objects = [] } = space?.db.query(DocumentType.filter()) ?? {};
        return objects
          .map<AutocompleteResult | undefined>((object) =>
            object.title?.length && object.id !== document?.id
              ? {
                  label: object.title,
                  // TODO(burdon): Factor out URL builder.
                  apply: `[${object.title}](/${object.id})`,
                }
              : undefined,
          )
          .filter(nonNullable);
      },
    },
    // TODO(burdon): Update position in editor: EditorView.scrollIntoView
    comments: space &&
      document && {
        onCreate: (cursor: string) => {
          // Create comment thread.
          const thread = space.db.add(new ThreadType());
          // const comment = space.db.add(new DocumentType.Comment({ thread, cursor }));
          document.comments.push({ thread, cursor });
          console.log(document.comments.length);

          void intentPlugin?.provides.intent.dispatch([
            {
              action: ThreadAction.SELECT,
              data: { active: thread.id, threads: [{ id: thread.id }] },
            },
            {
              action: LayoutAction.TOGGLE_COMPLEMENTARY_SIDEBAR,
              data: { state: true },
            },
          ]);

          return thread.id;
        },
        onSelect: (state) => {
          const { active, ranges } = state;
          void intentPlugin?.provides.intent.dispatch([
            {
              action: ThreadAction.SELECT,
              data: {
                active,
                threads: ranges?.map(({ id, location }) => ({ id, y: location?.top })) ?? [{ id: active }],
              },
            },
          ]);
        },
      },
  });

  const MarkdownMain: FC<{ document: DocumentType; readonly: boolean }> = ({ document, readonly }) => {
    const identity = useIdentity();
    const space = getSpaceForObject(document);
    const model = useTextModel({ identity, space, text: document.content });
    const comments = useMemo<CommentRange[]>(() => {
      return document.comments?.map((comment) => ({ id: comment.thread!.id, cursor: comment.cursor! }));
    }, [document.comments]);
    useEffect(() => {
      void intentPlugin?.provides.intent.dispatch({
        action: ThreadAction.SELECT,
      });
    }, [document.id]);

    if (!model) {
      return null;
    }

    return (
      <EditorMain
        readonly={readonly}
        editorMode={settings.values.editorMode}
        model={model}
        comments={comments}
        extensions={getExtensionsConfig(space!, document)}
        properties={document}
        layout='standalone'
        editorRefCb={pluginRefCallback}
      />
    );
  };

  const StandaloneMainMenu: FC<{ content: DocumentType }> = ({ content: document }) => {
    const identity = useIdentity();
    // TODO(wittjosiah): Should this be a hook?
    const space = getSpaceForObject(document);
    const model = useTextModel({ identity, space, text: document?.content });

    if (!model) {
      return null;
    }

    return <StandaloneMenu properties={document} model={model} editorRef={pluginMutableRef} />;
  };

  const MarkdownSection: FC<{ content: DocumentType }> = ({ content: document }) => {
    const identity = useIdentity();
    const space = getSpaceForObject(document);
    const model = useTextModel({ identity, space, text: document?.content });
    useEffect(() => {
      void intentPlugin?.provides.intent.dispatch({
        action: ThreadAction.SELECT,
      });
    }, [document.id]);

    if (!model) {
      return null;
    }

    return (
      <EditorSection
        editorMode={settings.values.editorMode}
        model={model}
        extensions={getExtensionsConfig(space!, document)}
      />
    );
  };

  return {
    meta,
    ready: async (plugins) => {
      settings
        .prop(settings.values.$editorMode!, 'editor-mode', LocalStorageStore.string)
        .prop(settings.values.$experimental!, 'experimental', LocalStorageStore.bool)
        .prop(settings.values.$debug!, 'debug', LocalStorageStore.bool);

      intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

      markdownPlugins(plugins).forEach((plugin) => {
        if (plugin.provides.markdown.onChange) {
          state.onChange.push(plugin.provides.markdown.onChange);
        }
      });
    },
    provides: {
      settings: settings.values,
      metadata: {
        records: {
          [DocumentType.schema.typename]: {
            placeholder: ['document title placeholder', { ns: MARKDOWN_PLUGIN }],
            icon: (props: IconProps) => <ArticleMedium {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (parent.data instanceof Folder || parent.data instanceof SpaceProxy) {
            const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

            parent.actionsMap[`${SPACE_PLUGIN}/create`]?.addAction({
              id: `${MARKDOWN_PLUGIN}/create`,
              label: ['create document label', { ns: MARKDOWN_PLUGIN }],
              icon: (props) => <ArticleMedium {...props} />,
              invoke: () =>
                intentPlugin?.provides.intent.dispatch([
                  {
                    plugin: MARKDOWN_PLUGIN,
                    action: MarkdownAction.CREATE,
                  },
                  {
                    action: SpaceAction.ADD_OBJECT,
                    data: { target: parent.data },
                  },
                  {
                    action: LayoutAction.ACTIVATE,
                  },
                ]),
              properties: {
                testId: 'markdownPlugin.createObject',
              },
            });
          } else if (parent.data instanceof DocumentType) {
            parent.addAction({
              id: `${MARKDOWN_PLUGIN}/toggle-readonly`,
              label: ['toggle view mode label', { ns: MARKDOWN_PLUGIN }],
              icon: (props) => <ArticleMedium {...props} />,
              keyBinding: 'shift+F5',
              invoke: () =>
                intentPlugin?.provides.intent.dispatch([
                  {
                    plugin: MARKDOWN_PLUGIN,
                    action: MarkdownAction.TOGGLE_VIEW,
                    data: {
                      objectId: parent.data.id,
                    },
                  },
                ]),
            });

            if (!parent.data.title) {
              effect(() => {
                const document = parent.data;
                parent.label = document.title ||
                  getFallbackTitle(document) || ['document title placeholder', { ns: MARKDOWN_PLUGIN }];
              });
            }
          }
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-doc',
            testId: 'markdownPlugin.createSection',
            label: ['create stack section label', { ns: MARKDOWN_PLUGIN }],
            icon: (props: any) => <ArticleMedium {...props} />,
            intent: {
              plugin: MARKDOWN_PLUGIN,
              action: MarkdownAction.CREATE,
            },
          },
        ],
      },
      surface: {
        component: ({ data, role, ...props }, forwardedRef) => {
          // TODO(wittjosiah): Improve the naming of surface components.
          switch (role) {
            case 'main': {
              if (isDocument(data.active)) {
                const readonly = settings.values.viewMode[data.active.id];
                return <MarkdownMain document={data.active} readonly={readonly} />;
              } else if (
                // TODO(burdon): Why 'composer' property?
                'composer' in data &&
                isMarkdown(data.composer) &&
                'properties' in data &&
                isMarkdownProperties(data.properties)
              ) {
                if ('view' in data && data.view === 'embedded') {
                  return <EditorMainEmbedded model={data.composer} properties={data.properties} />;
                } else {
                  return <EditorMainStandalone model={data.composer} properties={data.properties} />;
                }
              } else if (
                // TODO(burdon): Why 'composer' property?
                'composer' in data &&
                isMarkdownPlaceholder(data.composer) &&
                'properties' in data &&
                isMarkdownProperties(data.properties)
              ) {
                // TODO(burdon): Remove?
                return <MarkdownMainEmpty model={data.composer} properties={data.properties} />;
              }
              break;
            }

            case 'heading': {
              if (isGraphNode(data.activeNode) && isDocument(data.activeNode.data)) {
                return <StandaloneMainMenu content={data.activeNode.data} />;
              }
              break;
            }

            case 'section': {
              if (isDocument(data.object) && isMarkdown(data.object.content)) {
                return <MarkdownSection content={data.object} />;
              }
              break;
            }

            case 'card': {
              if (isObject(data.content) && typeof data.content.id === 'string' && isDocument(data.content.object)) {
                const cardProps = {
                  ...props,
                  item: {
                    id: data.content.id,
                    object: data.content.object,
                    color: typeof data.content.color === 'string' ? data.content.color : undefined,
                    extensions: getExtensionsConfig(),
                  },
                };

                return isTileComponentProps(cardProps) ? (
                  <EditorCard {...cardProps} ref={forwardedRef as Ref<HTMLDivElement>} />
                ) : null;
              }
              break;
            }

            case 'settings': {
              return data.plugin === meta.id ? <MarkdownSettings settings={settings.values} /> : null;
            }
          }

          return null;
        },
      },
      intent: {
        resolver: ({ action, data }) => {
          switch (action) {
            case MarkdownAction.CREATE: {
              return { object: new DocumentType() };
            }

            // TODO(burdon): Generalize for every object.
            case MarkdownAction.TOGGLE_VIEW: {
              const { objectId } = data;
              settings.values.viewMode[objectId as string] = !settings.values.viewMode[objectId];
              break;
            }
          }
        },
      },
    },
  };
};
