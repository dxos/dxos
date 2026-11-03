//
// Copyright 2025 DXOS.org
//

import { ViewPlugin } from '@codemirror/view';
import { useAtomSet, useAtomValue } from '@effect/atom-react';
import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Spec from '@dxos/compute/Spec';
import { mdl, mdlBlockDescription } from '@dxos/deus/extension';
import { diagramBlockDescription, diagramPreview } from '@dxos/diagram/extension';
import { Doc } from '@dxos/echo-doc';
import { useIdentity } from '@dxos/halo-react';
import { getSpace } from '@dxos/react-client/echo';
import { Attention } from '@dxos/react-ui-attention';
import { Editor } from '@dxos/react-ui-editor';
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
import { isTruthy } from '@dxos/util';

import { SPEC_INDEX, decisionGutter, pendingReveal, reviewGutter, sourceLinks } from '#components';

import { SPEC_COMPANION } from '../../constants.ts';
import { CodeNamespace } from '../../namespace.ts';
import { type SpecSessionState, registerEditor, reveal } from './spec-session.ts';
import { SpecPanel, useOpenSource } from './SpecPanel.tsx';
import { useSpecModel } from './useSpecModel.ts';
import { type DiffAgainst, useContributedExtensions } from './useSpecSources.ts';

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
    const { invokePromise } = AppHooks.useOperationInvoker();
    // Objects the text embeds render as their own plugin's widgets, through the editor's widget host.
    const contributed = useContributedExtensions(spec, { attendableId, t });
    const [widgets, setWidgets] = useState<WidgetState[]>([]);

    const source = { spec, content, sourceKey, base, review: staticReview };
    const { id, session, setSession, target, key, text, review, readLatest, decisions, baseText } =
      useSpecModel(source);
    const { fold } = session;
    const open = useOpenSource({ ...source, id, key, setSession });

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

    // A margin click shows its item in the panel, opening the plank's companion when the panel is there.
    const show = useCallback(
      (patch: Partial<SpecSessionState>) => {
        setSession((current) => ({ ...current, ...patch }));
        if (!panel && attendableId) {
          void invokePromise(LayoutOperation.UpdateCompanion, {
            subject: Attention.linkedSegment(SPEC_COMPANION),
            anchor: attendableId,
          });
        }
      },
      [setSession, panel, attendableId, invokePromise],
    );

    // Another article that opened this spec at an item left it pending; the text may arrive after mount.
    const pending = useAtomValue(pendingReveal);
    const setPendingReveal = useAtomSet(pendingReveal);
    useEffect(() => {
      if (pending && key && pending.path === key.path && reveal(id, pending.item)) {
        setPendingReveal(undefined);
      }
    }, [pending, id, key, text, setPendingReveal]);

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
          sourceLinks((target) => void open(target), SPEC_INDEX),
          ViewPlugin.define((editor) => ({ destroy: registerEditor(id, editor) })),
          decisions.length > 0 &&
            decisionGutter(decisions, (item) =>
              // A question is answered in the log, which lists it; a decision shows in the graph.
              show({
                selectedDecision: item,
                view: decisions.some(({ id, kind }) => id === item && kind === 'question') ? 'log' : 'decisions',
              }),
            ),
          review &&
            reviewGutter(review, {
              onSelect: (verdict) => show({ selectedVerdict: verdict, view: 'review' }),
              onOpen: (target) => void open(target),
              read: readLatest,
            }),
          diagramPreview(),
          widgetHost({ setWidgets }),
          ...contributed,
          baseText !== undefined &&
            diffView({
              original: baseText,
              orientation: 'changes',
              collapseUnchanged: fold ? FOLD_CONTEXT : undefined,
            }),
          // Live two-way binding only when editing an ECHO Spec; static content is rendered via `value`.
          spec &&
            target &&
            createDataExtensions({
              id: spec.id,
              text: Doc.createAccessor(target, ['content']),
              messenger: space,
              identity,
            }),
        ].filter(isTruthy),
      [
        id,
        identity,
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
        baseText,
        fold,
        contributed,
      ],
    );

    const editor = (
      // Scrolls the editor, which sizes to its content.
      <div className='relative overflow-auto h-full' data-testid='spec-article.spec'>
        <Editor.View classNames={editorClassNames(role)} value={spec ? undefined : text} />
      </div>
    );

    return (
      <Editor.Root extensions={extensions} widgets={widgets}>
        <Editor.Blocks />
        <Panel.Root role={role} ref={forwardedRef}>
          <Panel.Header>{!readOnly && <Editor.Toolbar role={role} attendableId={attendableId} />}</Panel.Header>
          <Panel.Body>
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
