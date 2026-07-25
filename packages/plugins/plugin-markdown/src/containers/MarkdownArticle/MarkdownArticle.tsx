//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { Atom } from '@effect-atom/atom-react';
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useIdentity } from '@dxos/halo-react';
import { log } from '@dxos/log';
import { useActionRunner } from '@dxos/plugin-graph';
import { Panel } from '@dxos/react-ui';
import { ViewState } from '@dxos/react-ui-attention';
import { Editor, type ViewModeItem, defaultViewModeItems, useEditorContext } from '@dxos/react-ui-editor';
import { graphActions, isToolbarAction } from '@dxos/react-ui-menu';
import { Text } from '@dxos/schema';
import { Merge } from '@dxos/util';

import {
  MarkdownEditor,
  type MarkdownEditorContentProps,
  MarkdownEditorProvider,
  type MarkdownEditorProviderProps,
} from '#components';
import { useLinkQuery } from '#hooks';
import {
  type EditorBinding,
  Markdown,
  MarkdownCapabilities,
  type MarkdownPluginState,
  type ReviewMode,
  type UseEditorBinding,
} from '#types';

import { mergeConflicts } from '../../extensions';

/**
 * Built-in binding when no {@link MarkdownCapabilities.EditorBindingHook} is contributed: bind the
 * object directly, no review affordances. The review mode is kept locally so contributed view-mode
 * entries (e.g. Suggesting) still toggle without a versioning host.
 */
const useDefaultEditorBinding: UseEditorBinding = ({ object, viewMode }) => {
  const [docContent] = useObject(Obj.instanceOf(Markdown.Document, object) ? object.content : undefined, 'content');
  const [textContent] = useObject(Obj.instanceOf(Text.Text, object) ? object : undefined, 'content');
  const [reviewMode, setReviewMode] = useState<ReviewMode>('editing');
  return {
    subject: object,
    initialValue: docContent ?? textContent,
    key: 'current',
    viewMode,
    loading: false,
    ambient: true,
    reviewMode,
    setReviewMode,
  };
};

/**
 * Calls the (single) binding hook through a component boundary so a change in which hook is
 * contributed remounts the boundary rather than violating the rules of hooks.
 */
// TODO(burdon): Review this mechanism.
const BindingBoundary = ({
  useBinding,
  props,
  children,
}: {
  useBinding: UseEditorBinding;
  props: Parameters<UseEditorBinding>[0];
  children: (binding: EditorBinding) => React.ReactNode;
}) => <>{children(useBinding(props))}</>;

// Mints a stable boundary key per hook identity: a REPLACED contribution (not just added/removed)
// must also remount the boundary, or the new hook would run against the old hook's state order.
const bindingKeys = new WeakMap<UseEditorBinding, number>();
let nextBindingKey = 0;
const bindingKeyOf = (hook: UseEditorBinding): string => {
  let key = bindingKeys.get(hook);
  if (key === undefined) {
    key = ++nextBindingKey;
    bindingKeys.set(hook, key);
  }
  return `binding-${key}`;
};

export type MarkdownArticleProps = AppSurface.ObjectArticleProps<
  Markdown.Document | Text.Text,
  Merge<
    {
      id: string;
      settings: Markdown.Settings;
      viewState?: ViewState.Manager;
    },
    Pick<MarkdownPluginState, 'extensionProviders'>,
    Pick<MarkdownEditorProviderProps, 'viewMode' | 'onSelectObject' | 'onViewModeChange'>,
    Pick<MarkdownEditorContentProps, 'editorStateStore'>
  >
>;

export const MarkdownArticle = forwardRef<HTMLDivElement, MarkdownArticleProps>((props, forwardedRef) => {
  const { subject: object, id, settings, viewMode } = props;
  // At most one contributed binding hook is honored; the boundary key remounts the subtree
  // whenever the effective hook's identity changes, keeping hook order legal.
  const bindingHooks = useCapabilities(MarkdownCapabilities.EditorBindingHook);
  if (bindingHooks.length > 1) {
    log.warn('multiple EditorBindingHook contributions; only the first is honored', {
      count: bindingHooks.length,
    });
  }
  const useBinding = bindingHooks.length > 0 ? bindingHooks[0] : useDefaultEditorBinding;
  const bindingProps = useMemo(
    () => ({ object, id, viewMode, diffView: settings.diffView }),
    [object, id, viewMode, settings.diffView],
  );

  return (
    <BindingBoundary key={bindingKeyOf(useBinding)} useBinding={useBinding} props={bindingProps}>
      {(binding) => <MarkdownArticleImpl {...props} binding={binding} ref={forwardedRef} />}
    </BindingBoundary>
  );
});

MarkdownArticle.displayName = 'MarkdownArticle';

const MarkdownArticleImpl = forwardRef<HTMLDivElement, MarkdownArticleProps & { binding: EditorBinding }>(
  (
    {
      role,
      subject: object,
      id,
      attendableId,
      settings,
      extensionProviders,
      onSelectObject,
      viewMode,
      onViewModeChange,
      binding,
      ...props
    },
    forwardedRef,
  ) => {
    const db = Obj.isObject(object) ? Obj.getDatabase(object) : undefined;

    // Local identity (collaboration awareness).
    const identity = useIdentity();

    // Extensions from other plugins, given the binding's review context.
    const otherExtensionProviders = useCapabilities(MarkdownCapabilities.ExtensionProvider);
    const extensionProps = binding.extensionProps;
    const extensions = useMemo<Extension[]>(() => {
      if (!Obj.instanceOf(Markdown.Document, object) && !Obj.instanceOf(Text.Text, object)) {
        return [];
      }

      const document = Obj.instanceOf(Markdown.Document, object) ? object : undefined;
      return [...(otherExtensionProviders ?? []), ...(extensionProviders ?? [])]
        .flat()
        .reduce((acc: Extension[], provider) => {
          const extension =
            typeof provider === 'function'
              ? provider({ document, viewMode, showComments: true, ...extensionProps })
              : provider;
          if (extension) {
            acc.push(extension);
          }

          return acc;
        }, []);
    }, [extensionProviders, otherExtensionProviders, object, viewMode, extensionProps]);

    // The binding's extensions (review overlays/compartments) are stable across keystrokes by
    // construction — recreating this array remounts nothing but recreates the editor state config.
    const combinedExtensions = useMemo<Extension[]>(
      () => [...extensions, mergeConflicts(), ...(binding.extensions ?? [])],
      [extensions, binding.extensions],
    );

    // Toolbar actions from the app graph. Branch selection / suggest / return-to-main live in the
    // History companion (the advanced path); the ambient review mode (incl. Suggesting) is surfaced in
    // the editor view-mode dropdown below.
    const { graph } = useAppGraph();
    const runAction = useActionRunner();
    const customActions = useMemo(
      () => Atom.make((get) => graphActions(graph, get, attendableId ?? id, { filter: isToolbarAction })),
      [graph, attendableId, id],
    );

    // View-mode dropdown entries: the built-in editor modes plus any contributed review modes (e.g.
    // Suggesting from plugin-review). On the ambient path the dropdown is the single GDocs-style mode
    // control — selecting a built-in also sets the review posture (source→editing, preview/readonly→
    // viewing) so leaving a contributed mode works; a contributed entry sets its review mode directly.
    // Off the ambient path (an explicit branch/checkpoint is selected) the review mode has no effect, so
    // only the built-in editor modes are shown.
    const { ambient, reviewMode, setReviewMode } = binding;
    const viewModeExtensions = useCapabilities(MarkdownCapabilities.ViewModeExtension);
    const viewModes = useMemo<ViewModeItem[]>(() => {
      const current = viewMode ?? 'source';
      const contributed: ViewModeItem[] = ambient
        ? [...viewModeExtensions]
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((extension) => ({
              id: extension.id,
              icon: extension.icon,
              label: extension.label,
              checked: reviewMode === extension.reviewMode,
              onSelect: () => setReviewMode(extension.reviewMode),
            }))
        : [];
      const contributedActive = contributed.some((item) => item.checked);
      const builtin: ViewModeItem[] = defaultViewModeItems.map((item) => ({
        ...item,
        // A contributed mode owns the single checked slot when active;
        // otherwise the built-in matching the current editor view mode is checked.
        checked: !contributedActive && item.id === current,
        onSelect: () => {
          onViewModeChange?.(item.id);
          if (ambient) {
            // Only `readonly` is a viewing posture: `preview` (labelled "Markdown") and `source`
            // ("Plain text") are both editable, and treating preview as viewing hid every suggestion
            // and locked the editor the moment the user picked the default mode.
            setReviewMode(item.id === 'readonly' ? 'viewing' : 'editing');
          }
        },
      }));
      return [...builtin, ...contributed];
    }, [viewMode, ambient, reviewMode, setReviewMode, onViewModeChange, viewModeExtensions]);

    // File upload.
    const [upload] = useCapabilities(AppCapabilities.FileUploader);
    const handleFileUpload = useMemo(() => {
      if (!db || !upload) {
        return undefined;
      }

      return async (file: File) => upload(db, file);
    }, [db, upload]);

    // Query for @ refs.
    const handleLinkQuery = useLinkQuery(db, Obj.isObject(object) ? object : undefined);

    // Open linked objects.
    const { invokePromise } = useOperationInvoker();
    const handleSelectObject = useCallback(
      (targetId: string) => {
        if (onSelectObject) {
          onSelectObject(targetId);
        } else {
          void invokePromise?.(LayoutOperation.Open, {
            subject: [targetId],
            pivotId: attendableId,
            // TODO(wittjosiah): This should probably pre-validate.
            navigation: 'immediate',
          });
        }
      },
      [onSelectObject, invokePromise, attendableId],
    );

    if (binding.loading) {
      return <Panel.Root role={role} ref={forwardedRef} />;
    }

    return (
      <MarkdownEditorProvider
        key={binding.key}
        id={id}
        attendableId={attendableId}
        object={binding.subject}
        compact={role !== AppSurface.Article.role}
        extensions={combinedExtensions}
        settings={settings}
        viewMode={binding.viewMode ?? viewMode}
        identity={identity}
        onAction={runAction}
        onFileUpload={handleFileUpload}
        onLinkQuery={handleLinkQuery}
        onSelectObject={handleSelectObject}
        onViewModeChange={onViewModeChange}
        {...props}
      >
        {(editorRootProps) => (
          <Editor.Root {...editorRootProps}>
            <RegisterEditorView id={id} attendableId={attendableId} />
            {binding.overlays}
            <Panel.Root role={role} ref={forwardedRef}>
              {settings.toolbar && (
                <Panel.Toolbar>
                  <MarkdownEditor.Toolbar
                    classNames='dx-document'
                    customActions={customActions}
                    viewModes={viewModes}
                  />
                </Panel.Toolbar>
              )}
              <Panel.Content classNames='flex flex-col'>
                {binding.banner}
                <MarkdownEditor.Content initialValue={binding.initialValue} />
                <Editor.Blocks />
                {/* Developer diagnostics panel (live editor state), gated behind the debug setting. */}
                {settings.debug && <Editor.Diagnostics />}
              </Panel.Content>
            </Panel.Root>
          </Editor.Root>
        )}
      </MarkdownEditorProvider>
    );
  },
);

MarkdownArticleImpl.displayName = 'MarkdownArticleImpl';

/**
 * Registers the mounted editor view in the shared `EditorViews` registry so operations (e.g.
 * `ScrollToAnchor` from comments/navigation) can target it by id. Must render inside `Editor.Root`.
 */
const RegisterEditorView = ({ id, attendableId }: { id: string; attendableId?: string }) => {
  const { controller } = useEditorContext('MarkdownArticle.RegisterEditorView');
  const [editorViews] = useCapabilities(MarkdownCapabilities.EditorViews);
  const view = controller?.view;
  useEffect(() => {
    if (view && editorViews) {
      editorViews.register(attendableId ?? id, view, id);
      return () => editorViews.unregister(attendableId ?? id);
    }
  }, [view, editorViews, attendableId, id]);

  return null;
};
