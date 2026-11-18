//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, createContext, forwardRef, useContext, useMemo } from 'react';

import { type FactAnalytics } from '@dxos/pipeline-rdf';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { factualityColor, formatDate, formatTerm } from '../../types.ts';
import { factBeliefTheme } from './FactBelief.theme.ts';
import { type Belief, type BeliefClaim, type BeliefState, useBelief } from './useBelief.ts';

const styles = factBeliefTheme.styles();

//
// One question, the answer that stands, and every claim behind it. A correction withdraws the stale claim from
// the answer without deleting it, so the store can say what it thinks AND why it once thought otherwise — which
// is what separates a memory you can audit from a cache you have to trust.
//

//
// Context
//

type FactBeliefContextValue = {
  belief: Belief;
  state: BeliefState;
  correction?: { label: string; apply: () => void };
};

const FactBeliefContext = createContext<FactBeliefContextValue | null>(null);

const useFactBeliefContext = (consumer: string): FactBeliefContextValue => {
  const context = useContext(FactBeliefContext);
  if (!context) {
    throw new Error(`FactBelief.${consumer} must be rendered within FactBelief.Root`);
  }
  return context;
};

//
// Root
//

type FactBeliefRootProps = Util.ThemedClassName<{
  analytics: FactAnalytics;
  belief: Belief;
  /** The correction on offer, if any: what it would assert, and how to write it. */
  correction?: { label: string; apply: () => void };
  /** Bumped by whoever writes to the store, since the store is not reactive. */
  revision?: number;
  children?: ReactNode;
}>;

/**
 * A single belief: the standing answer above, the claims behind it below. Standing is read from the store (a
 * `current` query), not re-derived here, so the view cannot disagree with what the store would tell an agent.
 */
const FactBeliefRoot = forwardRef<HTMLDivElement, FactBeliefRootProps>(
  ({ classNames, analytics, belief, correction, revision, children }, forwardedRef) => {
    const state = useBelief(analytics, belief, revision);
    const value = useMemo<FactBeliefContextValue>(
      () => ({ belief, state, ...(correction ? { correction } : {}) }),
      [belief, state, correction],
    );

    return (
      <FactBeliefContext.Provider value={value}>
        <div className={mx(styles.root(), classNames)} ref={forwardedRef}>
          {children ?? (
            <>
              <FactBeliefAnswer />
              <FactBeliefHistory />
            </>
          )}
        </div>
      </FactBeliefContext.Provider>
    );
  },
);

FactBeliefRoot.displayName = 'FactBelief.Root';

//
// Answer
//

type FactBeliefAnswerProps = Util.ThemedClassName<{}>;

/** What the store would tell an agent today, with the message it came from. */
const FactBeliefAnswer = ({ classNames }: FactBeliefAnswerProps) => {
  const { belief, state, correction } = useFactBeliefContext('Answer');
  const { answer } = state;
  return (
    <Panel.Root classNames={mx(styles.answerPanel(), classNames)}>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text classNames='grow'>Answer</Toolbar.Text>
          {correction && (
            <Button.Root
              icon='ph--pencil-simple--regular'
              label={correction.label}
              disabled={state.pending}
              onClick={correction.apply}
            />
          )}
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames={styles.answerBody()}>
        <p className={styles.question()}>{belief.question}</p>
        {state.pending && <Status.Empty>Asking the store…</Status.Empty>}
        {!state.pending && state.error && <Status.Empty>{state.error}</Status.Empty>}
        {!state.pending &&
          !state.error &&
          !answer && (
            // A retraction leaves no standing answer; saying so beats showing the withdrawn one. Only when the
            // store actually answered — a failed read is not an absence of belief.
            <p className={styles.answerEmpty()}>Nothing stands.</p>
          )}
        {answer && (
          <>
            <p className={styles.answerValue()}>{formatTerm(answer.fact.assertion.object)}</p>
            <p className={styles.citation()}>
              {[
                answer.fact.attribution.agentLabel ?? answer.fact.attribution.agent,
                answer.fact.attribution.source,
                formatDate(answer.fact.attribution.generatedAtTime),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {answer.fact.assertion.quote && <p className={styles.quote()}>"{answer.fact.assertion.quote}"</p>}
          </>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

FactBeliefAnswer.displayName = 'FactBelief.Answer';

//
// History
//

type FactBeliefHistoryProps = Util.ThemedClassName<{}>;

/** Every claim ever made, newest first; a withdrawn one is dimmed and struck through, never removed. */
const FactBeliefHistory = ({ classNames }: FactBeliefHistoryProps) => {
  const { state } = useFactBeliefContext('History');
  const withdrawn = state.history.filter((claim) => !claim.standing).length;
  return (
    <Panel.Root classNames={mx(styles.answerPanel(), classNames)}>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text classNames='grow'>
            {withdrawn > 0
              ? `Claims (${state.history.length}, ${withdrawn} withdrawn)`
              : `Claims (${state.history.length})`}
          </Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport classNames={styles.historyList()}>
            {state.error && <Status.Empty icon='ph--warning--regular'>{state.error}</Status.Empty>}
            {!state.error && !state.pending && state.history.length === 0 && (
              <Status.Empty>Nothing claimed about this yet.</Status.Empty>
            )}
            {state.history.map((claim) => (
              <FactBeliefClaim key={claim.fact.id} claim={claim} />
            ))}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

FactBeliefHistory.displayName = 'FactBelief.History';

//
// Claim
//

type FactBeliefClaimProps = Util.ThemedClassName<{ claim: BeliefClaim }>;

const FactBeliefClaim = forwardRef<HTMLDivElement, FactBeliefClaimProps>(({ classNames, claim }, forwardedRef) => {
  const { fact, standing, status } = claim;
  return (
    <div ref={forwardedRef}>
      <div className={styles.claim({ standing, class: mx(classNames) })}>
        <Tag.Tag hue={factualityColor(fact.factuality.value)}>{fact.factuality.value}</Tag.Tag>
        <span className={styles.claimValue({ standing })}>{formatTerm(fact.assertion.object)}</span>
        <span className={styles.claimMeta()}>
          {[
            standing ? undefined : status,
            fact.attribution.agentLabel ?? fact.attribution.agent,
            formatDate(fact.attribution.generatedAtTime),
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
      {fact.assertion.quote && <div className={styles.claimQuote()}>"{fact.assertion.quote}"</div>}
    </div>
  );
});

FactBeliefClaim.displayName = 'FactBelief.Claim';

//
// FactBelief
//

export const FactBelief = {
  Root: FactBeliefRoot,
  Answer: FactBeliefAnswer,
  History: FactBeliefHistory,
  Claim: FactBeliefClaim,
};

export { useBelief } from './useBelief.ts';
export type { Belief, BeliefClaim, BeliefState } from './useBelief.ts';
export type { FactBeliefAnswerProps, FactBeliefClaimProps, FactBeliefHistoryProps, FactBeliefRootProps };
