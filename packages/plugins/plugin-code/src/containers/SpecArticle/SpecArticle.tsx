//
// Copyright 2025 DXOS.org
//

import { EditorSelection } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { useAtomSet, useAtomValue } from '@effect/atom-react';
import React, {
  type KeyboardEvent,
  type PointerEvent,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { findSpecRefs, mdl, mdlBlockDescription, specReferenceFilter } from '@dxos/deus/extension';
import {
  type SourceKey,
  citedFiles,
  findSourceKeys,
  formatSourceKey,
  isSpecKey,
  parseReview,
  parseSourceKey,
  reviewKeyOf,
} from '@dxos/deus/review';
import { diagramBlockDescription, diagramPreview } from '@dxos/diagram/extension';
import { Doc } from '@dxos/echo-doc';
import { useObject } from '@dxos/echo-react';
import { useIdentity } from '@dxos/halo-react';
import { log } from '@dxos/log';
import { getSpace } from '@dxos/react-client/echo';
import { Editor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { SpecDocument } from '@dxos/types';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  diffView,
  documentSlots,
  editorClassNames,
} from '@dxos/ui-editor';
import { isTruthy, openExternalUrl } from '@dxos/util';

import {
  ApiSurface,
  ChangelogGraph,
  CodeView,
  DataModelGraph,
  DecisionLog,
  DefinitionGraph,
  type DefinitionModel,
  type GutterItem,
  ReviewPanel,
  SPEC_INDEX,
  answerQuestion,
  buildChangelogGraph,
  decisionGutter,
  pendingReveal,
  resolveSpecRef,
  reviewGutter,
  sourceLinks,
  toUserHandle,
} from '#components';
import { getSpecKey } from '#sync';
import { CodeOperation } from '#types';

import { CodeNamespace } from '../../namespace.ts';
import {
  type DiffAgainst,
  fileKey,
  useLocalTexts,
  useResolvedPath,
  useSpecDiff,
  useSpecSyncState,
} from './useSpecSources.ts';

/** What the panel beside the spec shows. */
const VIEWS = ['definitions', 'review', 'code', 'log', 'decisions', 'data', 'api'] as const;

type View = (typeof VIEWS)[number];

const VIEW_ICON: Record<View, string> = {
  definitions: 'ph--tree-structure--regular',
  review: 'ph--seal-check--regular',
  code: 'ph--file-code--regular',
  log: 'ph--users-three--regular',
  decisions: 'ph--graph--regular',
  data: 'ph--database--regular',
  api: 'ph--plugs-connected--regular',
};

const isView = (value: string): value is View => (VIEWS as readonly string[]).includes(value);

/** Bounds and keyboard step of the editor's share of the width, so neither side can be dragged shut. */
const MIN_SPLIT = 0.2;
const MAX_SPLIT = 0.8;
const SPLIT_STEP = 0.05;

/** Whether a `<spec id>#<item>` reference names a spec the bundled index could describe. */
const isIndexedSpec = specReferenceFilter(SPEC_INDEX);

const isDiffAgainst = (value: string): value is DiffAgainst => value === 'base' || value === 'head';

/** Lines of unchanged context kept around each change when unchanged runs are folded. */
const FOLD_CONTEXT = 3;

/** A remote-tracking ref as people say it: `origin/main` is `main`. */
const shortRef = (ref: string): string => ref.replace(/^origin\//, '');

/** A declaration line (`feat F-1: …`, `  req F-1.2: …`, `type Scene`) for the given id. */
const declarationOf = (id: string) =>
  new RegExp(`^\\s*[a-z]+\\s+${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?::|$)`);

export type SpecArticleProps = Omit<AppSurface.ObjectArticleProps<SpecDocument.SpecDocument>, 'subject'> & {
  /** ECHO Spec to live-edit; omit to render a static `content` string (e.g. a bundled plugin spec). */
  subject?: SpecDocument.SpecDocument;
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
};

/**
 * A spec as an IDE page: the MDL editor beside a panel of views. `github:` keys in the text are links (Ctrl/⌘-click):
 * a code key opens the file at its symbol, another spec's key opens that spec, synced from its checkout. The latest
 * compliance review (`<SPEC>.review.mdl` beside the spec) marks each reviewed item in the margin and on the graph.
 * Each ```diagram fence is drawn in place of its source until the selection enters it.
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
    },
    forwardedRef,
  ) => {
    const { t } = Hooks.useTranslation(CodeNamespace.key);
    const themeMode = Hooks.useThemeMode();
    const identity = useIdentity();
    const space = spec ? getSpace(spec) : undefined;
    const { invokePromise } = AppHooks.useOperationInvoker();
    const sync = useSpecSyncState();

    // Trigger re-render when the bound content ref resolves (no-op when there is no spec).
    const [snapshot] = useObject(spec?.content);
    const target = spec?.content.target;
    const ownText = (spec ? snapshot?.content : content) ?? '';

    const key = useMemo(
      () => (spec ? getSpecKey(spec) : sourceKey ? parseSourceKey(sourceKey) : undefined),
      [spec, sourceKey],
    );
    const reviewKey = key && formatSourceKey(reviewKeyOf(key));

    const [view, setView] = useState<View>('definitions');
    // The editor's share of the width; the divider between it and the panel drags it.
    const [split, setSplit] = useState(0.5);
    const splitRef = useRef<HTMLDivElement>(null);
    const handleSplitPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
      const bounds = splitRef.current?.getBoundingClientRect();
      if (!bounds) {
        return;
      }
      const divider = event.currentTarget;
      divider.setPointerCapture(event.pointerId);
      const handleMove = (move: globalThis.PointerEvent) =>
        setSplit(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, (move.clientX - bounds.left) / bounds.width)));
      const handleUp = () => {
        divider.removeEventListener('pointermove', handleMove);
        divider.removeEventListener('pointerup', handleUp);
      };
      divider.addEventListener('pointermove', handleMove);
      divider.addEventListener('pointerup', handleUp);
    }, []);
    const handleSplitKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
      const step = event.key === 'ArrowLeft' ? -SPLIT_STEP : event.key === 'ArrowRight' ? SPLIT_STEP : 0;
      if (step !== 0) {
        event.preventDefault();
        setSplit((current) => Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, current + step)));
      }
    }, []);
    const [codeTarget, setCodeTarget] = useState<SourceKey>();
    const [selectedVerdict, setSelectedVerdict] = useState<string>();
    const [selectedDecision, setSelectedDecision] = useState<string>();

    // Every file this page reads from the checkout: the review, specs the text names, the open code file, and, for a
    // bundled spec, its own file, so the page shows what is in the checkout rather than what was bundled.
    const related = useMemo(
      () =>
        [
          reviewKey,
          !spec && key && fileKey(key),
          codeTarget && fileKey(codeTarget),
          ...findSourceKeys(ownText)
            .map(({ key }) => key)
            .filter(isSpecKey)
            .map(fileKey),
          ...findSpecRefs(ownText)
            .filter(({ id }) => isIndexedSpec(id))
            .map(({ id }) => resolveSpecRef(SPEC_INDEX, id))
            .flatMap((resolved) => ('error' in resolved ? [] : [fileKey(resolved)])),
        ].filter(isTruthy),
      [reviewKey, spec, key, codeTarget, ownText],
    );
    // The code a review cites, for the declarations its chips and walkthroughs show.
    const [codeKeys, setCodeKeys] = useState<readonly string[]>([]);
    const texts = useLocalTexts(useMemo(() => [...related, ...codeKeys], [related, codeKeys]));
    const text = (!spec && key && texts.get(fileKey(key))) || ownText;
    const reviewText = (reviewKey ? texts.get(reviewKey) : undefined) ?? staticReview;
    const review = useMemo(() => (reviewText ? parseReview(reviewText) : undefined), [reviewText]);
    const citedKey = useMemo(() => (review ? citedFiles(review).join('\n') : ''), [review]);
    useEffect(() => setCodeKeys(citedKey ? citedKey.split('\n') : []), [citedKey]);
    const read = useCallback((target: SourceKey) => texts.get(fileKey(target)), [texts]);
    // Cards render on hover, so the gutter reads through a ref instead of rebuilding the editor on each file change.
    const textsRef = useRef(texts);
    useLayoutEffect(() => {
      textsRef.current = texts;
    }, [texts]);
    const readLatest = useCallback((target: SourceKey) => textsRef.current.get(fileKey(target)), []);
    const specs = useMemo(
      () => new Map([...texts].filter(([raw]) => raw.endsWith('.mdl') && raw !== reviewKey)),
      [texts, reviewKey],
    );
    const codePath = useResolvedPath(codeTarget);

    const { git, diff, setDiff, baseText, available: diffAvailable } = useSpecDiff(key, { base, defaultDiff });
    const [fold, setFold] = useState(false);
    const pullRequest = git?.pullRequest;

    // A spec with no changelog has none; slicing from -1 would make the whole body the "changelog".
    const changelogStart = text.search(/^## Changelog/m);
    const changelog = changelogStart < 0 ? '' : text.slice(changelogStart);
    const parsedDecisions = useMemo(
      () => buildChangelogGraph(changelog).nodes.filter((node): node is GutterItem => node.kind !== 'block'),
      [changelog],
    );
    // Held stable while the decisions are unchanged, so typing does not rebuild the editor's extensions (which resets it).
    const decisionsKey = JSON.stringify(
      parsedDecisions.map((item) => [
        item.id,
        item.entry.by,
        item.entry.affects,
        item.kind === 'question' ? item.answer?.id : item.supersededBy,
      ]),
    );
    const decisions = useMemo(() => parsedDecisions, [decisionsKey]);

    const viewRef = useRef<EditorView | undefined>(undefined);
    /** Scrolls to the declaration of `id`; false when the editor is not up or does not declare it. */
    const reveal = useCallback((id: string, focus = true): boolean => {
      const editor = viewRef.current;
      if (!editor) {
        return false;
      }
      const pattern = declarationOf(id);
      for (let number = 1; number <= editor.state.doc.lines; number++) {
        const line = editor.state.doc.line(number);
        if (pattern.test(line.text)) {
          editor.dispatch({
            selection: EditorSelection.cursor(line.from),
            effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
          });
          if (focus) {
            editor.focus();
          }
          return true;
        }
      }
      return false;
    }, []);

    // Another article that opened this spec at an item left it pending; the text may arrive after mount.
    const pending = useAtomValue(pendingReveal);
    const setPendingReveal = useAtomSet(pendingReveal);
    useEffect(() => {
      if (pending && key && pending.path === key.path && reveal(pending.item)) {
        setPendingReveal(undefined);
      }
    }, [pending, key, text, reveal, setPendingReveal]);

    const showCode = useCallback((target: SourceKey) => {
      setCodeTarget(target);
      setView('code');
    }, []);

    const open = useCallback(
      async (target: SourceKey) => {
        if (!isSpecKey(target)) {
          showCode(target);
          return;
        }
        if (key && fileKey(target) === fileKey(key)) {
          if (target.fragment) {
            reveal(target.fragment);
          }
          return;
        }
        // Another spec opens as its own synced Spec in this space; outside a space it is shown read-only here.
        if (space) {
          const { data, error } = await invokePromise(
            CodeOperation.ImportSpec,
            { key: formatSourceKey(target, false) },
            { spaceId: space.id },
          );
          const other = data && (await data.spec.load());
          if (other) {
            setPendingReveal(target.fragment ? { path: target.path, item: target.fragment } : undefined);
            await invokePromise(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(other)] });
            return;
          }
          log.warn('spec not imported', { key: formatSourceKey(target), error });
        }
        showCode(target);
      },
      [key, space, invokePromise, reveal, showCode, setPendingReveal],
    );

    const activate = useCallback(
      (definition: DefinitionModel) =>
        definition.external ? void open(definition.external.key) : reveal(definition.id),
      [open, reveal],
    );

    const selectVerdict = useCallback(
      (id: string) => {
        setSelectedVerdict(id);
        // The card list keeps focus, so the arrow keys keep moving through the verdicts.
        reveal(id, false);
      },
      [reveal],
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
          sourceLinks((target) => void open(target), SPEC_INDEX),
          ViewPlugin.define((editor) => {
            viewRef.current = editor;
            return { destroy: () => viewRef.current === editor && (viewRef.current = undefined) };
          }),
          decisions.length > 0 &&
            decisionGutter(decisions, (id) => {
              setSelectedDecision(id);
              // A question is answered in the log, which lists it; a decision shows in the graph.
              setView(decisions.some((item) => item.id === id && item.kind === 'question') ? 'log' : 'decisions');
            }),
          review &&
            reviewGutter(review, {
              onSelect: (id) => {
                setSelectedVerdict(id);
                setView('review');
              },
              onOpen: (target) => void open(target),
              read: readLatest,
            }),
          diagramPreview(),
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
        readLatest,
        baseText,
        fold,
      ],
    );

    // Appended through the editor, so the answer reaches the bound ECHO text and its collaborators like a typed edit.
    const handleAnswer = useCallback(
      (question: string, answer: string) => {
        const editor = viewRef.current;
        if (!editor) {
          return;
        }
        const name = identity?.displayName;
        const edit = answerQuestion(editor.state.doc.toString(), {
          question,
          answer,
          by: `user:${name ? toUserHandle(name) : identity?.did}`,
          date: new Date().toISOString().slice(0, 10),
        });
        if (!edit) {
          log.warn('answer not recorded: no changelog', { question });
          return;
        }
        editor.dispatch({ changes: edit });
        setSelectedDecision(question);
      },
      [identity],
    );
    // Only an editable spec bound to ECHO takes answers; a static or read-only one lists its questions.
    const canAnswer = !readOnly && spec !== undefined && identity !== undefined;

    const syncEntry = spec ? sync.specs[spec.id] : undefined;
    const codeText = codeTarget ? texts.get(fileKey(codeTarget)) : undefined;
    const openExternal = useCallback(
      (line?: number) =>
        codePath && void openExternalUrl(`vscode://file${codePath}${line !== undefined ? `:${line}` : ''}`),
      [codePath],
    );

    return (
      <Editor.Root extensions={extensions}>
        <Panel.Root role={role} ref={forwardedRef}>
          <Panel.Header>{!readOnly && <Editor.Toolbar role={role} attendableId={attendableId} />}</Panel.Header>
          <Panel.Body>
            <Layout.Grid ref={splitRef} cols={[split, 'min', 1 - split]} grow>
              {/* Scrolls the editor, which sizes to its content. */}
              <div className='relative overflow-auto' data-testid='spec-article.spec'>
                <Editor.View classNames={editorClassNames(role)} value={spec ? undefined : text} />
              </div>
              <div
                role='separator'
                aria-orientation='vertical'
                aria-valuenow={Math.round(split * 100)}
                tabIndex={0}
                className='w-1.5 cursor-col-resize border-x border-transparent bg-separator bg-clip-content px-0.5 hover:bg-accent-surface focus-visible:bg-accent-surface'
                onPointerDown={handleSplitPointerDown}
                onKeyDown={handleSplitKeyDown}
                data-testid='spec-article.divider'
              />
              <Panel.Root>
                <Panel.Header>
                  <Toolbar.Root>
                    <Toolbar.ToggleGroup
                      type='single'
                      value={view}
                      onValueChange={(value) => isView(value) && setView(value)}
                      aria-label={t('spec-view.label')}
                    >
                      {VIEWS.map((value) => (
                        <ToggleGroup.Item
                          key={value}
                          value={value}
                          icon={VIEW_ICON[value]}
                          label={t(`spec-view.${value}.label`)}
                          // Only the open view is labelled, so the toolbar fits a half-width panel.
                          iconOnly={value !== view}
                          data-testid={`spec-article.view.${value}`}
                        />
                      ))}
                    </Toolbar.ToggleGroup>
                    {diffAvailable && (
                      <>
                        <Toolbar.Separator />
                        <Toolbar.ToggleGroup
                          type='single'
                          value={diff ?? ''}
                          onValueChange={(value) => setDiff(isDiffAgainst(value) ? value : undefined)}
                          aria-label={t('spec-diff.label')}
                        >
                          <ToggleGroup.Item
                            value='base'
                            icon='ph--git-diff--regular'
                            label={t('spec-diff.base.label', { base: shortRef(git?.base ?? 'base') })}
                            disabled={git !== undefined && !git.mergeBase}
                            iconOnly
                            data-testid='spec-article.diff.base'
                          />
                          {git && (
                            <ToggleGroup.Item
                              value='head'
                              icon='ph--git-commit--regular'
                              label={t('spec-diff.head.label')}
                              iconOnly
                              data-testid='spec-article.diff.head'
                            />
                          )}
                        </Toolbar.ToggleGroup>
                        {diff && (
                          <Toolbar.ToggleGroup
                            type='single'
                            value={fold ? 'fold' : ''}
                            onValueChange={(value) => setFold(value === 'fold')}
                            aria-label={t('spec-diff.fold.label')}
                          >
                            <ToggleGroup.Item
                              value='fold'
                              icon='ph--arrows-in-line-vertical--regular'
                              label={t('spec-diff.fold.label')}
                              iconOnly
                              data-testid='spec-article.diff.fold'
                            />
                          </Toolbar.ToggleGroup>
                        )}
                      </>
                    )}
                    {pullRequest ? (
                      <Toolbar.Link
                        href={pullRequest.url}
                        title={`${pullRequest.title} (${git?.branch} → ${pullRequest.base})`}
                        onClick={(event) => {
                          event.preventDefault();
                          void openExternalUrl(pullRequest.url);
                        }}
                        data-testid='spec-article.pull-request'
                      >
                        <Tag.Tag hue='info'>
                          <Icon.Icon icon='ph--git-pull-request--regular' size='xs' />#{pullRequest.number}
                        </Tag.Tag>
                      </Toolbar.Link>
                    ) : (
                      git?.branch && (
                        <Tag.Tag title={`${git.branch} → ${shortRef(git.base)}`} data-testid='spec-article.branch'>
                          <Icon.Icon icon='ph--git-branch--regular' size='xs' />
                          {git.branch}
                        </Tag.Tag>
                      )
                    )}
                    {key && (
                      <Toolbar.Text classNames='font-mono text-xs'>
                        <span title={formatSourceKey(key)}>{key.path.split('/').slice(-2).join('/')}</span>
                      </Toolbar.Text>
                    )}
                    {syncEntry && (
                      <Tag.Tag
                        hue={syncEntry.status === 'error' || syncEntry.status === 'conflict' ? 'warning' : 'neutral'}
                        title={syncEntry.error ?? syncEntry.path}
                        data-testid='spec-article.sync-status'
                        data-status={syncEntry.status}
                      >
                        <Icon.Icon icon='ph--arrows-clockwise--regular' size='xs' />
                        {t(`spec-sync.${syncEntry.status}.label`)}
                      </Tag.Tag>
                    )}
                  </Toolbar.Root>
                </Panel.Header>
                <Panel.Body classNames='relative' data-testid='spec-article.panel' data-view={view}>
                  {view === 'definitions' && (
                    <DefinitionGraph
                      content={text}
                      base={baseText}
                      specs={specs}
                      index={SPEC_INDEX}
                      review={review}
                      onActivate={activate}
                    />
                  )}
                  {view === 'review' && (
                    <ReviewPanel
                      review={review}
                      reviewKey={reviewKey}
                      selected={selectedVerdict}
                      onSelect={selectVerdict}
                      onOpenCode={(target) => void open(target)}
                      read={read}
                    />
                  )}
                  {view === 'code' &&
                    (codeTarget ? (
                      <CodeView
                        label={formatSourceKey(codeTarget)}
                        path={codeTarget.path}
                        content={codeText}
                        symbol={codeTarget.fragment}
                        error={
                          !sync.available
                            ? t('code-view.no-files.label')
                            : !codePath
                              ? t('code-view.no-checkout.label', { repo: `${codeTarget.owner}/${codeTarget.repo}` })
                              : undefined
                        }
                        onOpenExternal={codePath ? openExternal : undefined}
                      />
                    ) : (
                      <Status.Empty classNames='dx-fill' data-testid='code-view.empty'>
                        {t('code-view.empty.label')}
                      </Status.Empty>
                    ))}
                  {view === 'log' && (
                    <DecisionLog
                      content={changelog}
                      selected={selectedDecision}
                      onAnswer={canAnswer ? handleAnswer : undefined}
                    />
                  )}
                  {view === 'decisions' && <ChangelogGraph content={changelog} selected={selectedDecision} />}
                  {view === 'data' && <DataModelGraph content={text} />}
                  {view === 'api' && <ApiSurface content={text} />}
                </Panel.Body>
              </Panel.Root>
            </Layout.Grid>
          </Panel.Body>
        </Panel.Root>
      </Editor.Root>
    );
  },
);

SpecArticle.displayName = 'SpecArticle';
