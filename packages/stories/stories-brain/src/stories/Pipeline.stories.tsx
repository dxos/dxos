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
import { type DocumentFacts, type Type, extractFactsStage } from '@dxos/pipeline-rdf';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import { DocumentEditor, FactViewer, PipelinePanel, type StageInfo } from '../components';

const SAMPLE_CONTENT = trim`
  - Socrates was a Greek philosopher.
  - Plato was his student.
  - Aristotle was his student.
  - Socrates is a man.
  - All men are mortal.
`;

const STAGES: StageInfo[] = [{ id: 'extract-facts', description: 'LLM proposition extraction (pipeline-rdf)' }];

type StoryArgs = {};

const DefaultStory = (_: StoryArgs) => {
  const [facts, setFacts] = useState<Type.Fact[]>([]);
  const [output, setOutput] = useState<unknown>();
  const [active, setActive] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  // Stream the document through the extraction stage; the sink collects per-document results.
  const handleRun = (text: string) => {
    setBusy(true);
    setActive('extract-facts');
    const program = Effect.gen(function* () {
      const collected: DocumentFacts[] = [];
      yield* Stream.fromIterable([{ text, source: 'editor:document' }]).pipe(
        extractFactsStage(),
        Pipeline.run({ sink: (out) => Effect.sync(() => collected.push(out)) }),
      );
      return collected;
    }).pipe(Effect.provide(Layer.fresh(AiServiceTestingPreset('edge-remote'))));

    void EffectEx.runPromise(program)
      .then((collected) => {
        setFacts(collected.flatMap((item) => [...item.facts]));
        setOutput(collected);
      })
      .catch((error) => setOutput({ error: String(error) }))
      .finally(() => {
        setBusy(false);
        setActive(undefined);
      });
  };

  return (
    <div className='dx-container grid grid-cols-[1fr_1fr_1fr] gap-2'>
      <DocumentEditor initialValue={SAMPLE_CONTENT} parse={stubParse} busy={busy} onRun={handleRun} />
      <PipelinePanel stages={STAGES} active={active} output={output} />
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
