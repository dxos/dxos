//
// Copyright 2026 DXOS.org
//

import { useAtom } from '@effect/atom-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type * as Spec from '@dxos/compute/Spec';
import { findSpecRefs, specReferenceFilter } from '@dxos/deus/extension';
import {
  type ReviewModel,
  type SourceKey,
  citedFiles,
  findSourceKeys,
  formatSourceKey,
  isSpecKey,
  parseReview,
  parseSourceKey,
  reviewKeyOf,
} from '@dxos/deus/review';
import { useObject } from '@dxos/echo-react';
import type * as FileSystem from '@dxos/plugin-file-system/FileSystem';
import * as SpecModel from '@dxos/plugin-projects/SpecModel';
import * as SpecSession from '@dxos/plugin-projects/SpecSession';
import * as SpecViews from '@dxos/plugin-projects/SpecViews';
import { type Text } from '@dxos/schema';
import { isTruthy } from '@dxos/util';

import { type GutterItem, SPEC_INDEX } from '#components';
import { getSpecKey } from '#sync';

import { fileKey, useLocalTexts, useResolvedPath, useSpecDiff } from './useSpecSources.ts';

/** Whether a `<spec id>#<item>` reference names a spec the bundled index could describe. */
const isIndexedSpec = specReferenceFilter(SPEC_INDEX);

export type SpecSource = {
  /** ECHO Spec to live-edit; omit to render a static `content` string (e.g. a bundled plugin spec). */
  spec?: Spec.Spec;
  /** Static MDL content, rendered read-only when no `spec` is provided. */
  content?: string;
  /** `github:` key of static content; an ECHO Spec's key comes from its meta keys. */
  sourceKey?: string;
  /** Base text that diff mode compares with, for hosts that cannot run git; git's base wins when both exist. */
  base?: string;
  /** Review text (`<SPEC>.review.mdl`) of static content; an ECHO spec's reviews are its SpecReviews. */
  review?: string;
};

/** The id a spec's session is kept under: an ECHO spec's own, else its source key. */
export const sessionId = ({ spec, sourceKey }: Pick<SpecSource, 'spec' | 'sourceKey'>): string =>
  spec?.id ?? sourceKey ?? 'static';

export type SpecArticleModel = {
  /** The session the editor and the panel share. */
  id: string;
  session: SpecSession.State;
  setSession: (update: (current: SpecSession.State) => SpecSession.State) => void;
  /** The ECHO text the editor binds to; undefined for static content. */
  target?: Text.Text;
  key?: SourceKey;
  reviewKey?: string;
  text: string;
  /** Files read from the checkout, by file key. */
  texts: ReadonlyMap<string, string>;
  /** The spec's reviews, newest first. */
  reviews: readonly SpecModel.ReviewData[];
  /** Each item's newest verdict across the reviews, or the static content's review. */
  review?: ReviewModel;
  read: (target: SourceKey) => string | undefined;
  /** Reads the latest files without rebuilding what holds it. */
  readLatest: (target: SourceKey) => string | undefined;
  /** The specs the text names, by file key. */
  specs: ReadonlyMap<string, string>;
  changelog: string;
  decisions: readonly GutterItem[];
  codePath?: string;
  git?: FileSystem.GitStatus;
  baseText?: string;
  diffAvailable: boolean;
};

/**
 * Everything the spec's editor and its panel read: its text, the files it names from the checkout, its reviews,
 * its decisions and what diff mode compares it with. Both call it, so either can be shown without the other.
 */
export const useSpecModel = ({
  spec,
  content,
  sourceKey,
  base,
  review: staticReview,
}: SpecSource): SpecArticleModel => {
  const id = sessionId({ spec, sourceKey });
  const [session, setSession] = useAtom(SpecSession.session(id));
  const { evidence } = session;

  // Trigger re-render when the bound content ref resolves (no-op when there is no spec).
  const [snapshot] = useObject(spec?.content);
  const target = spec?.content.target;
  const ownText = (spec ? snapshot?.content : content) ?? '';

  const key = useMemo(
    () => (spec ? getSpecKey(spec) : sourceKey ? parseSourceKey(sourceKey) : undefined),
    [spec, sourceKey],
  );
  const reviewKey = key && formatSourceKey(reviewKeyOf(key));

  // Every file this page reads from the checkout: the review, specs the text names, the open code file, and, for a
  // bundled spec, its own file, so the page shows what is in the checkout rather than what was bundled.
  const related = useMemo(
    () =>
      [
        !spec && reviewKey,
        !spec && key && fileKey(key),
        evidence && fileKey(evidence),
        ...findSourceKeys(ownText)
          .map(({ key }) => key)
          .filter(isSpecKey)
          .map(fileKey),
        ...findSpecRefs(ownText)
          .filter(({ id }) => isIndexedSpec(id))
          .map(({ id }) => SpecModel.resolveSpecRef(SPEC_INDEX, id))
          .flatMap((resolved) => ('error' in resolved ? [] : [fileKey(resolved)])),
      ].filter(isTruthy),
    [reviewKey, spec, key, evidence, ownText],
  );
  // The code a review cites, for the declarations its chips and walkthroughs show.
  const [codeKeys, setCodeKeys] = useState<readonly string[]>([]);
  const texts = useLocalTexts(useMemo(() => [...related, ...codeKeys], [related, codeKeys]));
  const text = (!spec && key && texts.get(fileKey(key))) || ownText;
  const reviewText = (!spec && reviewKey ? texts.get(reviewKey) : undefined) ?? staticReview;
  const { reviews, review: current } = SpecViews.useSpecReviews(spec);
  const review = useMemo(
    () => (spec ? current : reviewText ? parseReview(reviewText) : undefined),
    [spec, current, reviewText],
  );
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

  const codePath = useResolvedPath(evidence);
  const { git, baseText, available: diffAvailable } = useSpecDiff(key, { base, diff: session.diff });

  // A spec with no changelog has none; slicing from -1 would make the whole body the "changelog".
  const changelogStart = text.search(/^## Changelog/m);
  const changelog = changelogStart < 0 ? '' : text.slice(changelogStart);
  const parsedDecisions = useMemo(
    () => SpecModel.buildChangelogGraph(changelog).nodes.filter((node): node is GutterItem => node.kind !== 'block'),
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

  return {
    id,
    session,
    setSession,
    target,
    key,
    reviewKey,
    text,
    texts,
    reviews,
    review,
    read,
    readLatest,
    specs,
    changelog,
    decisions,
    codePath,
    git,
    baseText,
    diffAvailable,
  };
};
