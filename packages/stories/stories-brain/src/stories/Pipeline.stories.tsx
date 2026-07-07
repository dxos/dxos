//
// Copyright 2026 DXOS.org
//

/**
 * Prototype harness for running pipelines over a text document, one column per concern:
 *
 * - `DocumentEditor`: markdown editor with POS decorations and a toolbar button that triggers the pipeline.
 * - `PipelinePanel`: a pipeline picker (Facts / Transcription) + the selected pipeline's fixed stages.
 * - `OutputPanel`: tabbed output — the `FactPanel` (facts + entities + predicates) or the ECHO objects list.
 *
 * The Facts pipeline runs `pipeline-rdf`'s `extractFactsStage` (+ normalize) over the document via the
 * edge AI service (needs edge credentials); POS decorations use the offline stub tagger. The
 * Transcription pipeline is selectable and lists its stages, but running it over document text is not
 * wired here (it operates on transcript events via its own runtime — see `@dxos/pipeline-transcription`).
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

import { DocumentEditor, type EchoObjectItem, OutputPanel, type PipelineInfo, PipelinePanel } from '../components';

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

const PIPELINES: PipelineInfo[] = [
  {
    id: 'facts',
    label: 'Facts (RDF)',
    stages: [
      { id: 'extract-facts', description: 'LLM proposition extraction (pipeline-rdf)', enabled: true },
      { id: 'normalize-predicates', description: 'Canonicalize predicate synonyms', enabled: true },
    ],
  },
  {
    id: 'transcription',
    label: 'Transcription',
    stages: [
      { id: 'correction', description: 'Correct transcript text', enabled: true },
      { id: 'summarization', description: 'Summarize the transcript', enabled: true },
      { id: 'extraction', description: 'Extract structured items', enabled: false },
    ],
  },
];

// Placeholder ECHO objects for the Objects tab until an object-producing pipeline + space is wired.
const DEMO_OBJECTS: EchoObjectItem[] = [
  { id: 'person-socrates', typename: 'Person', label: 'Socrates' },
  { id: 'org-lyceum', typename: 'Organization', label: 'Lyceum' },
];

type StoryArgs = {};

const DefaultStory = (_: StoryArgs) => {
  const [pipelineId, setPipelineId] = useState(PIPELINES[0].id);
  const [facts, setFacts] = useState<Type.Fact[]>([]);
  const [busy, setBusy] = useState(false);

  // Run the selected pipeline over the document text. Only the Facts pipeline is wired; the
  // Transcription pipeline is selectable/listed but not runnable over document text here.
  const handleRun = (text: string) => {
    if (pipelineId !== 'facts') {
      return;
    }
    setBusy(true);
    const program = Effect.gen(function* () {
      const collected: DocumentFacts[] = [];
      yield* Stream.fromIterable([{ text, source: 'editor:document' }]).pipe(
        extractFactsStage(),
        normalizeFactsStage({ synonyms: SYNONYMS }),
        Pipeline.run({ sink: (out) => Effect.sync(() => collected.push(out)) }),
      );
      return collected;
    }).pipe(Effect.provide(Layer.fresh(AiServiceTestingPreset('edge-remote'))));

    void EffectEx.runPromise(program)
      .then((collected) => setFacts(collected.flatMap((item) => [...item.facts])))
      .finally(() => setBusy(false));
  };

  return (
    <div className='dx-container grid grid-cols-3 gap-2'>
      <DocumentEditor initialValue={SAMPLE_CONTENT} parse={stubParse} busy={busy} onRun={handleRun} />
      <PipelinePanel pipelines={PIPELINES} selected={pipelineId} onSelect={setPipelineId} busy={busy} />
      <OutputPanel facts={facts} objects={DEMO_OBJECTS} />
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
