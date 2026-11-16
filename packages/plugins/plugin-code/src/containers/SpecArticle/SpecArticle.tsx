//
// Copyright 2025 DXOS.org
//

import { useAtomSet, useAtomValue } from '@effect/atom-react';
import * as Atom from 'effect/reactivity/Atom';
import React, { forwardRef, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import type * as Spec from '@dxos/compute/Spec';
import { dialectBlockTypes, resolveDialects } from '@dxos/deus/dialect';
import { mdl, mdlBlockDescription, mdlSpec } from '@dxos/deus/extension';
import { diagramBlockDescription, diagramPreview } from '@dxos/diagram/extension';
import { Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { useIdentity } from '@dxos/halo-react';
import * as ProjectHooks from '@dxos/plugin-projects/ProjectHooks';
import * as SpecSession from '@dxos/plugin-projects/SpecSession';
import { getSpace } from '@dxos/react-client/echo';
import { Editor } from '@dxos/react-ui-editor';
import { graphActions, isToolbarAction } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Splitter from '@dxos/react-ui/Splitter';
import {
  type WidgetState,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  diffView,
  documentSlots,
  editorClassNames,
  widgetHost,
} from '@dxos/ui-editor';
import { type EditorViewMode } from '@dxos/ui-editor/types';
import { isTruthy } from '@dxos/util';

import { SPEC_INDEX, decisionGutter, pendingReveal, reviewGutter, sourceLinks } from '#components';
import { FrontMatter } from '#sync';

import { CodeNamespace } from '../../namespace.ts';
import { SpecPanel, useNamedDialects, useOpenSource, useShowView } from './SpecPanel.tsx';
import { useSpecModel } from './useSpecModel.ts';
import { type DiffAgainst } from './useSpecSources.ts';

/** Lower bound (rem) of either side while split, so a drag cannot squeeze one unreadable; the toggle hides the panel. */
const MIN_PANE_SIZE = 16;

/** Lines of unchanged context kept around each change when unchanged runs are folded. */
const FOLD_CONTEXT = 3;

export type SpecArticleProps = Omit<AppSurface.ObjectArticleProps<Spec.Spec>, 'subject'> & {
  /** ECHO Spec to live-edit; omit to render a static `content` string (e.g. a bundled plugin spec). */
  subject?: Spec.Spec;
  /** Static MDL content, rendered read-only when no `subject` is provided. */
  content?: string;
  /** `github:` key of static content; an ECHO Spec's key comes from its meta keys. */
  sourceKey?: string;
  /** Force read-only mode. Defaults to read-only for static content and editable when editing a Spec. */
  readOnly?: boolean;
  /** Base text that diff mode compares with, for hosts that cannot run git; git's base wins when both exist. */
  base?: string;
  /** Review text (`<SPEC>.review.mdl`), for hosts that cannot read the checkout; the checkout's review wins. */
  review?: string;
  /** Opens in diff mode against this base. */
  defaultDiff?: DiffAgainst;
  /**
   * Shows the spec's panel beside the text. An ECHO spec's panel is its companion, so this defaults to static content
   * only, which has no node to be the companion of.
   */
  panel?: boolean;
};

/**
 * A spec as an IDE page: the MDL editor, with its panel of views beside it or in its companion. `github:` keys in the
 * text are links (Ctrl/⌘-click): a code key opens the file at its symbol, another spec's key opens that spec, synced
 * from its checkout. The latest compliance review (`<SPEC>.review.mdl` beside the spec) marks each reviewed item in the
 * margin and on the graph. Each ```diagram fence is drawn in place of its source until the selection enters it.
 */
export const SpecArticle = forwardRef<HTMLDivElement, SpecArticleProps>(
  (
    {
      role,
      subject: spec,
      content,
      sourceKey,
      attendableId,
      readOnly = spec == null,
      base,
      review: staticReview,
      defaultDiff,
      panel = spec == null,
    },
    forwardedRef,
  ) => {
    const { t } = Hooks.useTranslation(CodeNamespace.key);
    const themeMode = Hooks.useThemeMode();
    const identity = useIdentity();
    const space = spec ? getSpace(spec) : undefined;
    const [widgets, setWidgets] = useState<WidgetState[]>([]);

    const source = { spec, content, sourceKey, base, review: staticReview };
    const { id, session, setSession, target, key, text, review, readLatest, decisions, baseText } =
      useSpecModel(source);
    const { fold } = session;
    // A margin click or a code key shows its item in a view, opening the view's companion tab when the panel is not on
    // the page.
    const show = useShowView({ setSession, attendableId, panel });
    const open = useOpenSource({ ...source, id, key, show });
    // Objects the text embeds render as their own plugin's widgets, through the editor's widget host; comments on the
    // spec anchor into the text the editor is bound to.
    const binding = useMemo(() => (target ? { object: target, path: ['content'] } : undefined), [target]);
    const contributed = ProjectHooks.useSpecExtensions(spec, { attendableId, t, binding });
    const fieldExtensions = ProjectHooks.useSpecFieldExtensions(spec, binding);
    const defaultView = ProjectHooks.useDefaultSpecView();
    const [viewMode, setViewMode] = useState<EditorViewMode>(defaultView);
    // Diff mode compares the text, so it keeps the blocks as text.
    const forms = ProjectHooks.useSpecBlockForms(spec, {
      viewMode: baseText === undefined ? viewMode : 'source',
      fieldExtensions,
    });

    useEffect(() => {
      if (defaultDiff) {
        setSession((current) => ({ ...current, diff: defaultDiff }));
      }
    }, [defaultDiff, setSession]);

    // The panel's width in rem, held here so it survives a collapse; seeded to half the page on first layout.
    const [panelSize, setPanelSize] = useState<number>();
    const [panelOpen, setPanelOpen] = useState(true);
    const splitRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
      const width = splitRef.current?.getBoundingClientRect().width;
      if (width) {
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        setPanelSize((current) => current ?? width / 2 / rem);
      }
    }, []);

    // Another article that opened this spec at an item left it pending; the text may arrive after mount.
    const pending = useAtomValue(pendingReveal);
    const setPendingReveal = useAtomSet(pendingReveal);
    const setCursor = useAtomSet(SpecSession.cursor(id));
    const owner = useId();
    useEffect(() => {
      if (pending && key && pending.path === key.path && SpecSession.reveal(id, pending.item)) {
        setPendingReveal(undefined);
      }
    }, [pending, id, key, text, setPendingReveal]);

    // The file is compared in the form the text shows it: after its front matter (a spec's fields), or whole.
    const original = useMemo(
      () => (baseText === undefined || FrontMatter.body(text) !== text ? baseText : FrontMatter.body(baseText)),
      [baseText, text],
    );

    // A bundled spec's dialects are its file's; a spec's come with its extensions.
    const bundledDialects = useNamedDialects(spec, text);
    const bundledFacts = useMemo(
      () => (spec ? [] : [mdlSpec.of({ types: dialectBlockTypes(resolveDialects(bundledDialects)) })]),
      [spec, bundledDialects],
    );

    // A review keeps its `github:` evidence keys, which the index would report as errors.
    const isReviewFile = key?.path.endsWith('.review.mdl') ?? false;
    const extensions = useMemo(
      () =>
        [
          createBasicExtensions({ lineNumbers: true, readOnly }),
          createMarkdownExtensions({ codeLanguages: [mdlBlockDescription, diagramBlockDescription] }),
          createThemeExtensions({ themeMode, slots: documentSlots }),
          decorateMarkdown(),
          mdl(isReviewFile ? {} : { index: SPEC_INDEX }),
          ...bundledFacts,
          sourceLinks((target) => void open(target), SPEC_INDEX),
          SpecSession.editor(id, owner, setCursor),
          decisions.length > 0 &&
            // The ledger opens a decision's thread, or lists a question among the questions.
            decisionGutter(decisions, (item) => show('decisions', 'ledger', { selectedDecision: item })),
          review &&
            reviewGutter(review, {
              onSelect: (verdict) => show('review', 'review', { selectedVerdict: verdict, selectedReview: undefined }),
              onOpen: (target) => void open(target),
              read: readLatest,
            }),
          diagramPreview(),
          forms.extension,
          widgetHost({ setWidgets }),
          ...contributed,
          original !== undefined &&
            diffView({
              original,
              orientation: 'changes',
              collapseUnchanged: fold ? FOLD_CONTEXT : undefined,
            }),
          // Live two-way binding only when editing an ECHO Spec; static content is rendered via `value`.
          spec &&
            target &&
            createDataExtensions({
              // The awareness channel the project's spec editor uses too, so peers in either view see each other.
              id: Obj.getURI(spec),
              text: Doc.createAccessor(target, ['content']),
              messenger: space,
              identity,
              wrapAwareness: forms.wrapAwareness,
            }),
        ].filter(isTruthy),
      [
        id,
        identity,
        owner,
        setCursor,
        space,
        spec?.id,
        target,
        themeMode,
        readOnly,
        isReviewFile,
        decisions,
        review,
        open,
        show,
        readLatest,
        original,
        fold,
        contributed,
        bundledFacts,
        forms,
      ],
    );

    const editor = (
      // Scrolls the editor, which sizes to its content.
      <div className='relative overflow-auto h-full' data-testid='spec-article.spec'>
        <Editor.View classNames={editorClassNames(role)} value={spec ? undefined : text} />
      </div>
    );

    return (
      <Editor.Root extensions={extensions} widgets={widgets} viewMode={viewMode}>
        <Panel.Root role={role} ref={forwardedRef}>
          {!readOnly && (
            <SpecToolbar role={role} attendableId={attendableId} onViewModeChange={spec ? setViewMode : undefined} />
          )}
          <Panel.Body>
            {/* Inside the body: a portal anchor beside the panel would be a row of the host's grid. */}
            <Editor.Blocks />
            {panel ? (
              <Splitter.Root
                ref={splitRef}
                orientation='horizontal'
                anchor='end'
                mode={panelOpen ? 'split' : 'start'}
                size={panelSize}
                onSizeChange={setPanelSize}
                resizable
                minSize={MIN_PANE_SIZE}
              >
                <Splitter.Panel position='start'>
                  {editor}
                  {/* Outside the scroller, so the toggle stays at the seam whether the panel is open or hidden. */}
                  <Button.Root
                    variant='ghost'
                    icon={panelOpen ? 'ph--caret-line-right--regular' : 'ph--caret-line-left--regular'}
                    iconOnly
                    label={t(panelOpen ? 'spec-panel.hide.label' : 'spec-panel.show.label')}
                    tooltipSide='left'
                    aria-expanded={panelOpen}
                    classNames='absolute top-1 end-3 z-10 bg-base-surface'
                    onClick={() => setPanelOpen((open) => !open)}
                    data-testid='spec-article.panel-toggle'
                  />
                </Splitter.Panel>
                <Splitter.ResizeTrigger aria-label={t('spec-panel.resize.label')} data-testid='spec-article.divider' />
                <Splitter.Panel position='end'>
                  <SpecPanel {...source} readOnly={readOnly} />
                </Splitter.Panel>
              </Splitter.Root>
            ) : (
              editor
            )}
          </Panel.Body>
        </Panel.Root>
      </Editor.Root>
    );
  },
);

SpecArticle.displayName = 'SpecArticle';

/**
 * The editor's toolbar, with the toolbar actions other plugins give the spec's node, such as commenting, and the choice
 * of text or a form per block. A host with a toolbar of its own (a project's Specs tab) takes them instead, and the
 * article has no header.
 */
const SpecToolbar = ({
  role,
  attendableId,
  onViewModeChange,
}: Pick<SpecArticleProps, 'role' | 'attendableId'> & { onViewModeChange?: (mode: EditorViewMode) => void }) => {
  const hosted = ProjectHooks.useSpecToolbar({ attendableId, onViewModeChange });
  const { graph } = ToolkitHooks.useAppGraph();
  const customActions = useMemo(
    () =>
      attendableId
        ? Atom.make((get) => graphActions(graph, get, attendableId, { filter: isToolbarAction }))
        : undefined,
    [graph, attendableId],
  );

  return hosted ? null : (
    <Panel.Header>
      <Editor.Toolbar
        role={role}
        attendableId={attendableId}
        customActions={customActions}
        onViewModeChange={onViewModeChange}
      />
    </Panel.Header>
  );
};
