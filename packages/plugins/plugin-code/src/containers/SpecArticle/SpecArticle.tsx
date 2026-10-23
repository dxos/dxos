//
// Copyright 2025 DXOS.org
//

import { EditorSelection } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';
import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { mdl, mdlBlockDescription } from '@dxos/deus/extension';
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
import * as Tag from '@dxos/react-ui/Tag';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { Spec } from '@dxos/types';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  editorClassNames,
} from '@dxos/ui-editor';
import { isTruthy, openExternalUrl } from '@dxos/util';

import {
  ApiSurface,
  ChangelogGraph,
  CodeView,
  DataModelGraph,
  type DecisionModel,
  DefinitionGraph,
  type DefinitionModel,
  ReviewPanel,
  buildChangelogGraph,
  citedFiles,
  decisionGutter,
  parseReview,
  reviewGutter,
  sourceLinks,
} from '#components';
import { meta } from '#meta';
import {
  type SourceKey,
  findSourceKeys,
  formatSourceKey,
  getSpecKey,
  isSpecKey,
  parseSourceKey,
  reviewKeyOf,
} from '#sync';
import { CodeOperation } from '#types';

import { fileKey, useLocalTexts, useResolvedPath, useSpecSyncState } from './useSpecSources.ts';

/** What the panel beside the spec shows. */
const VIEWS = ['definitions', 'review', 'code', 'decisions', 'data', 'api'] as const;

type View = (typeof VIEWS)[number];

const VIEW_ICON: Record<View, string> = {
  definitions: 'ph--tree-structure--regular',
  review: 'ph--seal-check--regular',
  code: 'ph--file-code--regular',
  decisions: 'ph--graph--regular',
  data: 'ph--database--regular',
  api: 'ph--plugs-connected--regular',
};

const isView = (value: string): value is View => (VIEWS as readonly string[]).includes(value);

/** A declaration line (`feat F-1: …`, `  req F-1.2: …`, `type Scene`) for the given id. */
const declarationOf = (id: string) =>
  new RegExp(`^\\s*[a-z]+\\s+${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?::|$)`);

export type SpecArticleProps = Omit<AppSurface.ObjectArticleProps<Spec.Spec>, 'subject'> & {
  /** ECHO Spec to live-edit; omit to render a static `content` string (e.g. a bundled plugin spec). */
  subject?: Spec.Spec;
  /** Static MDL content, rendered read-only when no `subject` is provided. */
  content?: string;
  /** `github:` key of static content; an ECHO Spec's key comes from its meta keys. */
  sourceKey?: string;
  /** Force read-only mode. Defaults to read-only for static content and editable when editing a Spec. */
  readOnly?: boolean;
};

/**
 * A spec as an IDE page: the MDL editor beside a panel of views. `github:` keys in the text are links (Ctrl/⌘-click):
 * a code key opens the file at its symbol, another spec's key opens that spec, synced from its checkout. The latest
 * compliance review (`<SPEC>.review.mdl` beside the spec) marks each reviewed item in the margin and on the graph.
 * Each ```diagram fence is drawn in place of its source until the selection enters it.
 */
export const SpecArticle = forwardRef<HTMLDivElement, SpecArticleProps>(
  ({ role, subject: spec, content, sourceKey, attendableId, readOnly = spec == null }, forwardedRef) => {
    const { t } = Hooks.useTranslation(meta.profile.key);
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
        ].filter(isTruthy),
      [reviewKey, spec, key, codeTarget, ownText],
    );
    // The code a review cites, for the declarations its chips and walkthroughs show.
    const [codeKeys, setCodeKeys] = useState<readonly string[]>([]);
    const texts = useLocalTexts(useMemo(() => [...related, ...codeKeys], [related, codeKeys]));
    const text = (!spec && key && texts.get(fileKey(key))) || ownText;
    const reviewText = reviewKey ? texts.get(reviewKey) : undefined;
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

    // A spec with no changelog has none; slicing from -1 would make the whole body the "changelog".
    const changelogStart = text.search(/^## Changelog/m);
    const changelog = changelogStart < 0 ? '' : text.slice(changelogStart);
    const parsedDecisions = useMemo(
      () => buildChangelogGraph(changelog).nodes.filter((node): node is DecisionModel => node.kind === 'decision'),
      [changelog],
    );
    // Held stable while the decisions are unchanged, so typing does not rebuild the editor's extensions (which resets it).
    const decisionsKey = JSON.stringify(parsedDecisions.map(({ id, entry }) => [id, entry.by, entry.affects]));
    const decisions = useMemo(() => parsedDecisions, [decisionsKey]);

    const viewRef = useRef<EditorView | undefined>(undefined);
    const reveal = useCallback((id: string, focus = true) => {
      const editor = viewRef.current;
      if (!editor) {
        return;
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
          return;
        }
      }
    }, []);

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
          target.fragment && reveal(target.fragment);
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
            await invokePromise(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(other)] });
            return;
          }
          log.warn('spec not imported', { key: formatSourceKey(target), error });
        }
        showCode(target);
      },
      [key, space, invokePromise, reveal, showCode],
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

    const extensions = useMemo(
      () =>
        [
          createBasicExtensions({ lineNumbers: true, readOnly }),
          createMarkdownExtensions({ codeLanguages: [mdlBlockDescription, diagramBlockDescription] }),
          createThemeExtensions({ themeMode, slots: documentSlots }),
          decorateMarkdown(),
          mdl(),
          sourceLinks((target) => void open(target)),
          ViewPlugin.define((editor) => {
            viewRef.current = editor;
            return { destroy: () => viewRef.current === editor && (viewRef.current = undefined) };
          }),
          decisions.length > 0 &&
            decisionGutter(decisions, (id) => {
              setSelectedDecision(id);
              setView('decisions');
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
      [identity, space, spec?.id, target, themeMode, readOnly, decisions, review, open, readLatest],
    );

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
            <Layout.Grid cols={['fill', 'fill']} grow classNames='divide-x divide-separator'>
              {/* Scrolls the editor, which sizes to its content. */}
              <div className='relative overflow-auto' data-testid='spec-article.spec'>
                <Editor.View classNames={editorClassNames(role)} value={spec ? undefined : text} />
              </div>
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
                          data-testid={`spec-article.view.${value}`}
                        />
                      ))}
                    </Toolbar.ToggleGroup>
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
                    <DefinitionGraph content={text} specs={specs} review={review} onActivate={activate} />
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
                      <Layout.Flex classNames='p-4 text-description'>{t('code-view.empty.label')}</Layout.Flex>
                    ))}
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
