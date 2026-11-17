//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useEffect, useMemo, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations } from '@dxos/react-ui/translations';

import {
  type Decision,
  type IngestTrace,
  type MemoryRow,
  type MemoryType,
  QUERIES,
  type RecallTrace,
  ReferenceProfile,
  RETRIEVERS,
  SESSIONS,
} from '../agent-memory/index.ts';

const TYPE_STYLE: Record<MemoryType, string> = {
  fact: 'text-sky-text',
  event: 'text-amber-text',
  instruction: 'text-violet-text',
  task: 'text-emerald-text',
};

const DECISION_STYLE: Record<Decision, string> = {
  insert: 'text-success-text',
  supersede: 'text-amber-text',
  duplicate: 'text-description',
};

/** Pause between pipeline stages, so the stages read one at a time instead of landing at once. */
const STAGE_DELAY = 700;

const Column = ({ title, toolbar, children }: { title: string; toolbar?: ReactNode; children: ReactNode }) => (
  <Panel.Root classNames='border border-separator rounded-md overflow-hidden'>
    <Panel.Header>
      {/* A plain row, not `Toolbar.Root`: the toolbar keeps its first render of each item, so live labels go stale. */}
      <div className='flex items-center gap-1 p-1 border-b border-separator'>
        <span className='px-2 font-medium'>{title}</span>
        <span className='grow' />
        {toolbar}
      </div>
    </Panel.Header>
    <Panel.Body classNames='overflow-y-auto p-2 flex flex-col gap-3 text-sm'>{children}</Panel.Body>
  </Panel.Root>
);

const Section = ({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) => (
  <section className='flex flex-col gap-1' data-testid={testId}>
    <h3 className='text-xs uppercase tracking-wide text-description'>{title}</h3>
    {children}
  </section>
);

const Mono = ({ children, classNames }: { children: ReactNode; classNames?: string }) => (
  <code className={`font-mono text-xs ${classNames ?? ''}`}>{children}</code>
);

const Conversation = ({
  profile,
  ingested,
  onIngest,
}: {
  profile: ReferenceProfile;
  ingested: Set<string>;
  onIngest: (index: number) => void;
}) => (
  <>
    {SESSIONS.map((session, index) => (
      <Section key={session.id} title={`${session.label} — sessionId ${session.id}`}>
        <ul className='flex flex-col gap-1'>
          {session.messages.map((message, position) => (
            <li
              key={position}
              className={`rounded px-2 py-1 ${message.role === 'user' ? 'bg-input-surface' : 'text-description'}`}
            >
              <span className='text-xs text-description mr-1'>{message.role}</span>
              {message.content}
            </li>
          ))}
        </ul>
        <div>
          <Button.Root data-testid={`agent-memory.ingest.${index + 1}`} onClick={() => onIngest(index)}>
            {ingested.has(session.id) ? 're-ingest()' : 'ingest()'}
          </Button.Root>
        </div>
      </Section>
    ))}
    <p className='text-xs text-description'>
      Profile key <Mono>{profile.key}</Mono> — one isolated store per profile.
    </p>
  </>
);

const Pipeline = ({ trace, stage }: { trace?: IngestTrace; stage: number }) => {
  if (!trace) {
    return <p className='text-description'>ingest() resolves at once; processing runs later from a queue.</p>;
  }
  return (
    <>
      <Section title={`1 · Store raw messages (content-addressed) — ${trace.sessionId}`} testId='agent-memory.stage.1'>
        <p>
          {trace.messages.stored.length} stored, {trace.messages.skipped} already present (idempotent)
        </p>
        {trace.messages.stored.slice(0, 3).map((row) => (
          <Mono key={row.id} classNames='text-description'>
            {row.id} ← hash(session, role, content)
          </Mono>
        ))}
      </Section>
      {stage >= 2 && (
        <Section title='2 · Extract + classify (LLM in the real service)' testId='agent-memory.stage.2'>
          {trace.extracted.length === 0 && <p className='text-description'>Nothing new to extract.</p>}
          {trace.extracted.map((item, index) => (
            <div key={index} className='flex flex-col'>
              <span>
                <span className={`font-medium ${TYPE_STYLE[item.type]}`}>{item.type}</span> {item.summary}
              </span>
              <Mono classNames='text-description'>
                topic={item.topicKey} keywords=[{item.keywords.join(', ')}]
              </Mono>
            </div>
          ))}
        </Section>
      )}
      {stage >= 3 && (
        <Section title='3 · Deduplicate by topic key' testId='agent-memory.stage.3'>
          {trace.decisions.map(({ item, decision, memoryId, previousId }, index) => (
            <span key={index}>
              <span className={`font-medium ${DECISION_STYLE[decision]}`}>{decision}</span> {item.topicKey}{' '}
              <Mono classNames='text-description'>
                {previousId ? `${previousId.slice(-6)} → ` : ''}
                {memoryId.slice(-6)}
              </Mono>
            </span>
          ))}
        </Section>
      )}
      {stage >= 4 && (
        <Section title='4 · Write rows + full-text index + vectors (tasks not embedded)' testId='agent-memory.stage.4'>
          <p className='text-success-text'>Indexed. Available to recall().</p>
        </Section>
      )}
    </>
  );
};

const MemoryTable = ({ rows }: { rows: MemoryRow[] }) => (
  <table className='w-full text-xs' data-testid='agent-memory.table'>
    <thead className='text-description text-left'>
      <tr>
        <th className='font-normal'>id (ULID)</th>
        <th className='font-normal'>type</th>
        <th className='font-normal'>summary</th>
        <th className='font-normal'>topic_key</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.id} className={row.supersededBy || row.deletedAt ? 'line-through text-description' : ''}>
          <td>
            <Mono>{row.id}</Mono>
          </td>
          <td className={TYPE_STYLE[row.type]}>{row.type}</td>
          <td>{row.summary}</td>
          <td>
            <Mono>{row.topicKey}</Mono>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const Recall = ({ trace }: { trace?: RecallTrace }) => {
  if (!trace) {
    return <p className='text-description'>Pick a question.</p>;
  }
  return (
    <>
      <Section title='Query analysis'>
        <Mono>terms=[{trace.analysis.terms.join(', ')}]</Mono>
        <Mono>topics=[{trace.analysis.topics.join(', ')}]</Mono>
      </Section>
      <Section
        title='Candidates — rank per retriever, fused with reciprocal-rank fusion'
        testId='agent-memory.candidates'
      >
        {trace.candidates.length === 0 && <p className='text-description'>No candidates.</p>}
        <table className='w-full text-xs'>
          <tbody>
            {trace.candidates.map((candidate) => (
              <tr key={candidate.id}>
                <td className='pr-2'>
                  <Mono>{candidate.score.toFixed(2)}</Mono>
                </td>
                <td className='pr-2 whitespace-nowrap'>
                  {RETRIEVERS.map((retriever) => (
                    <Mono
                      key={retriever}
                      classNames={trace.ranks[candidate.id]?.[retriever] ? 'mr-1' : 'mr-1 text-description opacity-40'}
                    >
                      {retriever[0].toUpperCase()}
                      {trace.ranks[candidate.id]?.[retriever] ?? '·'}
                    </Mono>
                  ))}
                </td>
                <td>{candidate.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Section title='answer (synthesized from the top candidates)' testId='agent-memory.answer'>
        <p className='rounded bg-input-surface px-2 py-1'>
          {trace.answer || <span className='text-description'>(empty — nothing matched)</span>}
        </p>
      </Section>
    </>
  );
};

const snapshotOf = (profile: ReferenceProfile) => ({
  pending: profile.pending,
  memories: profile.tables().memories.map((row) => ({ ...row })),
});

const AgentMemoryDemo = () => {
  const profile = useMemo(
    () => new ReferenceProfile('ns_demo:dana', { seed: 7, now: () => new Date('2026-11-17T09:00:00Z') }),
    [],
  );
  // Copies, not the live rows: the React Compiler memoizes on identity, so in-place mutation would never re-render.
  const [snapshot, setSnapshot] = useState(() => snapshotOf(profile));
  useEffect(() => profile.subscribe(() => setSnapshot(snapshotOf(profile))), [profile]);
  const [ingested, setIngested] = useState(new Set<string>());
  const [trace, setTrace] = useState<IngestTrace>();
  const [stage, setStage] = useState(0);
  const [recall, setRecall] = useState<RecallTrace>();
  const [view, setView] = useState<'pipeline' | 'table' | 'summary'>('pipeline');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (!trace || stage >= 4) {
      return;
    }
    const timer = setTimeout(() => setStage((current) => current + 1), STAGE_DELAY);
    return () => clearTimeout(timer);
  }, [trace, stage]);

  const handleIngest = (index: number) => {
    const session = SESSIONS[index];
    void profile.ingest(session.messages, { sessionId: session.id });
    setIngested((current) => new Set([...current, session.id]));
  };

  const handleDrain = () => {
    const traces = profile.drain();
    setView('pipeline');
    setTrace(traces[traces.length - 1]);
    setStage(1);
  };

  const handleSummary = () => {
    void profile.getSummary().then(({ summary }) => setSummary(summary));
    setView('summary');
  };

  const { memories, pending } = snapshot;

  return (
    <div className='grid grid-cols-[1fr_1.2fr_1.2fr] grid-rows-[100%] gap-2 p-2 w-full h-full'>
      <Column title='Conversation'>
        <Conversation profile={profile} ingested={ingested} onIngest={handleIngest} />
      </Column>
      <Column
        title='Ingest pipeline'
        toolbar={
          <>
            <Button.Root data-testid='agent-memory.drain' disabled={pending === 0} onClick={handleDrain}>
              Process queue ({pending})
            </Button.Root>
            <Button.Root
              data-testid='agent-memory.view.table'
              variant={view === 'table' ? 'primary' : 'ghost'}
              onClick={() => setView('table')}
            >
              Rows ({memories.length})
            </Button.Root>
            <Button.Root
              data-testid='agent-memory.view.summary'
              variant={view === 'summary' ? 'primary' : 'ghost'}
              onClick={handleSummary}
            >
              getSummary()
            </Button.Root>
          </>
        }
      >
        {view === 'pipeline' && <Pipeline trace={trace} stage={stage} />}
        {view === 'table' && <MemoryTable rows={memories} />}
        {view === 'summary' && (
          <pre className='whitespace-pre-wrap text-xs' data-testid='agent-memory.summary'>
            {summary}
          </pre>
        )}
      </Column>
      <Column title='recall()'>
        <div className='flex flex-col items-start gap-1'>
          {QUERIES.map((query, index) => (
            <Button.Root
              key={query}
              data-testid={`agent-memory.query.${index + 1}`}
              onClick={() =>
                setRecall(profile.recallTrace(query, { responseLength: 'long', referenceDate: '2026-11-17' }))
              }
            >
              {query}
            </Button.Root>
          ))}
        </div>
        <Recall trace={recall} />
      </Column>
    </div>
  );
};

/**
 * A reference model of Cloudflare Agent Memory (private beta), built from its docs and the binding's
 * published types: ingest() enqueues, a consumer extracts → classifies → dedupes by topic key → stores,
 * and recall() fuses four retrievers before synthesizing an answer.
 */
const meta = {
  title: 'stories/stories-brain/AgentMemory',
  component: AgentMemoryDemo,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof AgentMemoryDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
