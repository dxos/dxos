//
// Copyright 2026 DXOS.org
//

/**
 * Prototype harness for running pipelines over a text document, one column per concern:
 *
 * - `DocumentEditor`: markdown editor with POS decorations and a toolbar button that triggers the pipeline.
 * - `FactViewer`: extracted facts (list/graph views).
 * - `PipelinePanel`: the composed stages and the raw output of the latest run (placeholder).
 *
 * `Default` runs the pipeline-rdf `extractFactsStage` over the document via the edge AI service
 * (needs edge credentials); POS decorations use the offline stub tagger. Variants of this story
 * will swap in different pipelines operating on the same document.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import React, { useState } from 'react';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { EffectEx } from '@dxos/effect';
import { stubParse } from '@dxos/nlp/testing';
import { Pipeline } from '@dxos/pipeline';
import { type DocumentFacts, type Type, extractFactsStage, normalizeFactsStage } from '@dxos/pipeline-rdf';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import { DocumentEditor, FactViewer, PipelinePanel, type StageInfo } from '../components';

const SAMPLE_CONTENT = trim`
  - Socrates was a Greek philosopher.
  - Plato was his student.
  - Aristotle was his student.
  - Socrates was a man.
  - All men are mortal.
  - Aristotle worked for the Lyceum.
`;

// Demo synonym table for the normalize stage (keys are relation-key normalized, so inflections match).
const SYNONYMS: Record<string, string> = {
  'works for': 'works at',
  'employed by': 'works at',
};

const STAGES: StageInfo[] = [
  {
    id: 'extract-facts',
    description: 'LLM proposition extraction (pipeline-rdf)',
    enabled: true,
  },
  {
    id: 'normalize-predicates',
    description: 'Canonicalize predicate synonyms',
    enabled: true,
  },
];

type StoryArgs = {};

const DefaultStory = (_: StoryArgs) => {
  const [stages, setStages] = useState<StageInfo[]>(STAGES);
  const [facts, setFacts] = useState<Type.Fact[]>([]);
  const [output, setOutput] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  // Stream the document through the enabled stages; the sink collects per-document results.
  const handleRun = (text: string) => {
    const enabled = (id: string) => stages.some((stage) => stage.id === id && stage.enabled);
    if (!enabled('extract-facts')) {
      setOutput({ skipped: 'extract-facts disabled' });
      return;
    }
    setBusy(true);

    const program = Effect.gen(function* () {
      const collected: DocumentFacts[] = [];
      const extracted = Stream.fromIterable([{ text, source: 'editor:document' }]).pipe(extractFactsStage());
      const normalized = enabled('normalize-predicates')
        ? extracted.pipe(normalizeFactsStage({ synonyms: SYNONYMS }))
        : extracted;

      yield* normalized.pipe(
        Pipeline.run({
          sink: (out) => Effect.sync(() => collected.push(out)),
        }),
      );
      return collected;
    }).pipe(Effect.provide(Layer.fresh(AiServiceTestingPreset('edge-remote'))));

    void EffectEx.runPromise(program)
      .then((collected) => {
        setFacts(collected.flatMap((item) => [...item.facts]));
        setOutput(collected);
      })
      .catch((error) => setOutput({ error: String(error) }))
      .finally(() => setBusy(false));
  };

  return (
    <div className='dx-container grid grid-cols-[1fr_1fr_1fr] gap-2'>
      <DocumentEditor initialValue={SAMPLE_CONTENT} parse={stubParse} busy={busy} onRun={handleRun} />
      <PipelinePanel stages={stages} onStagesChanged={setStages} busy={busy} output={output} />
      <FactViewer facts={facts} />
    </div>
  );
};

const meta = {
  title: 'stories/stories-brain/stories/Pipeline',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    controls: { disable: true },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
