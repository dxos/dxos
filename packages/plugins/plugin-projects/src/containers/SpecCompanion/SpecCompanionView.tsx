//
// Copyright 2026 DXOS.org
//

import { useAtom, useAtomValue } from '@effect/atom-react';
import React, { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Spec from '@dxos/compute/Spec';
import { type ReviewModel } from '@dxos/deus/review';
import { Doc } from '@dxos/echo-doc';
import { useObject } from '@dxos/echo-react';
import { useIdentity } from '@dxos/halo-react';
import { log } from '@dxos/log';

import {
  DecisionCursor,
  DecisionLedger,
  DefinitionFocus,
  DefinitionGraph,
  type DefinitionModel,
  type ReviewData,
  ReviewPanel,
  answerQuestion,
  approveDecisions,
  toReviewModel,
  toUserHandle,
} from '#components';
import { ProjectCapabilities } from '#types';

import { type SpecViewId } from '../../companion-views.ts';
import { useSpecFacts, useSpecReviews } from '../../hooks/index.ts';
import * as SpecSession from '../../SpecSession.ts';

const NO_REVIEWS: readonly ReviewData[] = [];

/** The `## Changelog` section of a spec; a spec with none has none, rather than its whole body. */
const changelogOf = (text: string): string => {
  const start = text.search(/^## Changelog/m);
  return start < 0 ? '' : text.slice(start);
};

export type SpecCompanionViewProps = ProjectCapabilities.SpecSources & {
  view: SpecViewId;
  /** The session the views share with the spec's editor. */
  id: string;
  /** The ECHO spec, which takes answers and approvals unless `readOnly`; absent for a static spec. */
  spec?: Spec.Spec;
  text: string;
  dialects: readonly string[];
  /** The spec's reviews, newest first, which the review view lets a reader pick from. */
  reviews?: readonly ReviewData[];
  /** Each item's newest verdict across the reviews. */
  review?: ReviewModel;
  reviewKey?: string;
  facts?: ProjectCapabilities.SpecFacts;
  readOnly?: boolean;
};

/**
 * One view of a spec that reads any dialect's blocks: its definitions, what the cursor's block touches, its decisions
 * and its review. It shares its session with the spec's editor, wherever that is open, so either moves the other.
 */
export const SpecCompanionView = ({
  view,
  id,
  spec,
  text,
  dialects,
  reviews = NO_REVIEWS,
  review,
  reviewKey,
  facts,
  readOnly = false,
  base,
  specs,
  index,
  read,
  onOpenSource,
}: SpecCompanionViewProps) => {
  const identity = useIdentity();
  const [session, setSession] = useAtom(SpecSession.session(id));
  const { selectedVerdict, selectedReview, selectedDecision } = session;
  const cursor = useAtomValue(SpecSession.cursor(id));
  const changelog = useMemo(() => changelogOf(text), [text]);

  // The review view shows the current status or one review; the editor's chips always show the current status.
  const history = useMemo(
    () => reviews.map(({ id, date, by, commit }) => ({ id, label: `${date} · ${by} · ${commit.slice(0, 7)}` })),
    [reviews],
  );
  const shownReview = useMemo(() => {
    const picked = selectedReview && reviews.find(({ id }) => id === selectedReview);
    return picked ? toReviewModel(picked) : review;
  }, [reviews, review, selectedReview]);

  const update = useCallback(
    (patch: Partial<SpecSession.State>) => setSession((current) => ({ ...current, ...patch })),
    [setSession],
  );

  const activate = useCallback(
    (definition: DefinitionModel) =>
      definition.external ? onOpenSource?.(definition.external.key) : SpecSession.reveal(id, definition.id),
    [id, onOpenSource],
  );

  const selectVerdict = useCallback(
    (verdict: string) => {
      update({ selectedVerdict: verdict });
      // The card list keeps focus, so the arrow keys keep moving through the verdicts.
      SpecSession.reveal(id, verdict, false);
    },
    [id, update],
  );

  // Appends a decision through the open editor when there is one, so it reaches collaborators like a typed edit; else
  // as a minimal change to the spec's text. Returns whether the spec had a changelog to append to.
  const appendDecision = useCallback(
    (edit: (current: string, by: string, date: string) => { from: number; to: number; insert: string } | undefined) => {
      const editor = SpecSession.getEditor(id);
      const current = editor ? editor.state.doc.toString() : text;
      const name = identity?.displayName;
      const change = edit(
        current,
        `user:${name ? toUserHandle(name) : identity?.did}`,
        new Date().toISOString().slice(0, 10),
      );
      if (!change) {
        return false;
      }
      const target = spec?.content.peek();
      if (editor) {
        editor.dispatch({ changes: change });
      } else if (target) {
        Doc.updateText(target, ['content'], current.slice(0, change.from) + change.insert + current.slice(change.to));
      }
      return true;
    },
    [id, identity, text, spec],
  );
  const handleAnswer = useCallback(
    (question: string, answer: string) => {
      if (!appendDecision((current, by, date) => answerQuestion(current, { question, answer, by, date }))) {
        log.warn('answer not recorded: no changelog', { question });
        return;
      }
      update({ selectedDecision: question });
    },
    [appendDecision, update],
  );
  const handleApprove = useCallback(
    (ids: readonly string[]) => {
      if (!appendDecision((current, by, date) => approveDecisions(current, { ids, by, date }))) {
        log.warn('approval not recorded: no changelog', { ids });
      }
    },
    [appendDecision],
  );
  const openLedger = useCallback(
    (decision: string) =>
      setSession((current) => ({
        ...current,
        selectedDecision: decision,
        views: { ...current.views, decisions: 'ledger' },
      })),
    [setSession],
  );
  // Only an editable spec bound to ECHO takes answers and approvals; a static or read-only one lists them.
  const canAnswer = !readOnly && spec !== undefined && identity !== undefined;

  switch (view) {
    case 'definitions':
      return (
        <DefinitionGraph
          content={text}
          dialects={dialects}
          base={base}
          specs={specs}
          index={index}
          review={review}
          facts={facts}
          onActivate={activate}
        />
      );
    case 'related':
      return (
        <DefinitionFocus
          content={text}
          cursor={cursor}
          dialects={dialects}
          base={base}
          specs={specs}
          index={index}
          review={review}
          facts={facts}
          onActivate={activate}
        />
      );
    case 'review':
      return (
        <ReviewPanel
          review={shownReview}
          history={history}
          selectedReview={shownReview === review ? undefined : selectedReview}
          onSelectReview={(next) => update({ selectedReview: next })}
          reviewKey={reviewKey}
          selected={selectedVerdict}
          onSelect={selectVerdict}
          onOpenCode={onOpenSource}
          read={read}
        />
      );
    case 'cursor':
      return (
        <DecisionCursor
          content={text}
          cursor={cursor}
          onApprove={canAnswer ? handleApprove : undefined}
          onAnswer={canAnswer ? handleAnswer : undefined}
          onOpenLedger={openLedger}
        />
      );
    case 'ledger':
      return (
        <DecisionLedger
          content={changelog}
          selected={selectedDecision}
          onApprove={canAnswer ? handleApprove : undefined}
          onAnswer={canAnswer ? handleAnswer : undefined}
          onShowBlock={(block) => SpecSession.reveal(id, block)}
        />
      );
  }
};

const NO_DIALECTS: readonly string[] = [];

export type SpecViewProps = { spec: Spec.Spec; view: SpecViewId };

/** A view of an ECHO spec in its companion tab, reading what else it needs from the plugin that provides it. */
export const SpecView = ({ spec, view }: SpecViewProps) => {
  const [dialects = NO_DIALECTS] = useObject(spec, 'dialects');
  const [content] = useObject(spec.content);
  const { reviews, review } = useSpecReviews(spec);
  const facts = useSpecFacts(dialects);
  const [Provider] = Hooks.useCapabilities(ProjectCapabilities.SpecSourcesProvider);
  const props: SpecCompanionViewProps = {
    view,
    id: spec.id,
    spec,
    text: content?.content ?? '',
    dialects,
    reviews,
    review,
    facts,
  };
  return Provider ? (
    <Provider spec={spec}>{(sources) => <SpecCompanionView {...props} {...sources} />}</Provider>
  ) : (
    <SpecCompanionView {...props} />
  );
};
