//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, createContext, forwardRef, useContext, useMemo, useState } from 'react';

import { type FactAnalytics, type RDF } from '@dxos/pipeline-rdf';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { factualityColor, formatDate, formatTerm } from '../../types.ts';
import { factMemoryTheme } from './FactMemory.theme.ts';
import {
  type EntityMemory,
  type FactMemory as FactMemoryState,
  type MessagePreview,
  useFactMemory,
} from './useFactMemory.ts';

const styles = factMemoryTheme.styles();

//
// "Facts are memory for new mail": a message the store was never written from, beside what the store already
// knows about the things it mentions. The store is built from older mail, so anything it says here is context it
// supplies rather than context it was given — which is the only way the claim can be read honestly.
//

//
// Context
//

type FactMemoryContextValue = {
  message: MessagePreview;
  memory: FactMemoryState;
  revealed: boolean;
  setRevealed: (revealed: boolean) => void;
};

const FactMemoryContext = createContext<FactMemoryContextValue | null>(null);

const useFactMemoryContext = (consumer: string): FactMemoryContextValue => {
  const context = useContext(FactMemoryContext);
  if (!context) {
    throw new Error(`FactMemory.${consumer} must be rendered within FactMemory.Root`);
  }
  return context;
};

//
// Root
//

type FactMemoryRootProps = Util.ThemedClassName<{
  /** Reads over the store built from the OLDER mail; the message below is not in it. */
  analytics: FactAnalytics;
  message: MessagePreview;
  children?: ReactNode;
}>;

/**
 * The held-out-message demo: an incoming message on one side, the store's prior knowledge of its entities on the
 * other. The facts extracted from the message itself are the answer key and stay hidden until asked for, so the
 * prior knowledge is read before the answer is known.
 */
const FactMemoryRoot = forwardRef<HTMLDivElement, FactMemoryRootProps>(
  ({ classNames, analytics, message, children }, forwardedRef) => {
    const [revealed, setRevealed] = useState(false);
    const memory = useFactMemory(analytics, message.entities);
    const value = useMemo<FactMemoryContextValue>(
      () => ({ message, memory, revealed, setRevealed }),
      [message, memory, revealed],
    );

    return (
      <FactMemoryContext.Provider value={value}>
        <div className={mx(styles.root(), classNames)} ref={forwardedRef}>
          {children ?? (
            <>
              <FactMemoryMessage />
              <FactMemoryKnowledge />
            </>
          )}
        </div>
      </FactMemoryContext.Provider>
    );
  },
);

FactMemoryRoot.displayName = 'FactMemory.Root';

//
// Message
//

type FactMemoryMessageProps = Util.ThemedClassName<{}>;

/** The held-out message, the entities it mentions, and — once revealed — the facts extracted from it. */
const FactMemoryMessage = ({ classNames }: FactMemoryMessageProps) => {
  const { message, memory, revealed, setRevealed } = useFactMemoryContext('Message');
  return (
    <Panel.Root classNames={mx(styles.panel(), classNames)}>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text classNames='grow'>Incoming message</Toolbar.Text>
          <Button.Root
            icon={revealed ? 'ph--eye-slash--regular' : 'ph--eye--regular'}
            iconOnly
            label={revealed ? 'Hide the extracted facts' : 'Reveal the extracted facts'}
            disabled={(message.facts ?? []).length === 0}
            onClick={() => setRevealed(!revealed)}
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport classNames={styles.message()}>
            <div className={styles.messageMeta()}>
              {[message.from, formatDate(message.receivedAt)].filter(Boolean).join(' · ')}
            </div>
            <p className={styles.messageBody()}>{message.body}</p>

            <div className={styles.chips()}>
              {message.entities.map((entity) => {
                const known = memory.known.some((candidate) => candidate.key === entity.key);
                return (
                  <Tag.Tag key={entity.key} hue={known ? 'emerald' : 'neutral'}>
                    {entity.label}
                  </Tag.Tag>
                );
              })}
            </div>

            <p className={styles.verdict()}>
              {memory.pending
                ? 'Asking the store what it already knows…'
                : `${memory.known.length} of ${memory.entities.length} entities are already known; ${memory.unknown.length} are new.`}
            </p>

            {revealed && (
              <>
                <div className={styles.messageMeta()}>Extracted from this message</div>
                {(message.facts ?? []).map((fact) => (
                  <FactMemoryPrior key={fact.id} fact={fact} />
                ))}
              </>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

FactMemoryMessage.displayName = 'FactMemory.Message';

//
// Knowledge
//

type FactMemoryKnowledgeProps = Util.ThemedClassName<{}>;

/** Per entity the message mentions, what the store held before it arrived — newest first, with attribution. */
const FactMemoryKnowledge = ({ classNames }: FactMemoryKnowledgeProps) => {
  const { memory } = useFactMemoryContext('Knowledge');
  return (
    <Panel.Root classNames={mx(styles.panel(), classNames)}>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text classNames='grow'>What the inbox already knew</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport classNames={styles.memoryList()}>
            {memory.error && <Status.Empty icon='ph--warning--regular'>{memory.error}</Status.Empty>}
            {!memory.error && memory.pending && <Status.Empty>Loading…</Status.Empty>}
            {!memory.error && !memory.pending && memory.known.length === 0 && (
              <Status.Empty>Nothing known about this message's entities.</Status.Empty>
            )}
            {memory.known.map((entity) => (
              <FactMemoryEntity key={entity.key} entity={entity} />
            ))}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

FactMemoryKnowledge.displayName = 'FactMemory.Knowledge';

//
// Entity
//

type FactMemoryEntityProps = Util.ThemedClassName<{ entity: EntityMemory }>;

const FactMemoryEntity = forwardRef<HTMLDivElement, FactMemoryEntityProps>(({ classNames, entity }, forwardedRef) => (
  <div className={mx(styles.entity(), classNames)} ref={forwardedRef}>
    <div className={styles.entityHeader()}>
      <span className={styles.entityName()}>{entity.label}</span>
      <span className={styles.entityCount()}>
        {entity.total > entity.facts.length
          ? `${entity.facts.length} of ${entity.total.toLocaleString()} prior facts`
          : `${entity.total.toLocaleString()} prior facts`}
      </span>
    </div>
    {entity.facts.map((fact) => (
      <FactMemoryPrior key={fact.id} fact={fact} />
    ))}
  </div>
));

FactMemoryEntity.displayName = 'FactMemory.Entity';

//
// Prior
//

type FactMemoryPriorProps = Util.ThemedClassName<{ fact: RDF.Fact }>;

/** One statement as a line: the triple, its stance, and who said it when. */
const FactMemoryPrior = ({ classNames, fact }: FactMemoryPriorProps) => {
  const { assertion, factuality, attribution } = fact;
  return (
    <div className={mx(styles.priorFact(), classNames)}>
      <span className={styles.priorSubject()}>{formatTerm(assertion.subject)}</span>
      <span className={styles.priorPredicate()}>{assertion.predicate}</span>
      <span className={styles.priorObject()}>{formatTerm(assertion.object)}</span>
      <span className={styles.priorSlack()} />
      <Tag.Tag hue={factualityColor(factuality.value)}>{factuality.value}</Tag.Tag>
      <span className={styles.priorAgent()}>{attribution.agentLabel ?? attribution.agent}</span>
      <span className={styles.priorDate()}>{formatDate(attribution.generatedAtTime)}</span>
    </div>
  );
};

FactMemoryPrior.displayName = 'FactMemory.Prior';

//
// FactMemory
//

export const FactMemory = {
  Root: FactMemoryRoot,
  Message: FactMemoryMessage,
  Knowledge: FactMemoryKnowledge,
  Entity: FactMemoryEntity,
  Prior: FactMemoryPrior,
};

export { FACTS_PER_ENTITY, useFactMemory } from './useFactMemory.ts';
export type { EntityMemory, MentionedEntity, MessagePreview } from './useFactMemory.ts';
export type {
  FactMemoryEntityProps,
  FactMemoryKnowledgeProps,
  FactMemoryMessageProps,
  FactMemoryPriorProps,
  FactMemoryRootProps,
};
