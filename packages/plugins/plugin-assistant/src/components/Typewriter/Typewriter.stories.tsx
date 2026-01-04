//
// Copyright 2026 DXOS.org
//

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { use, useEffect, useState } from 'react';

import { AiService } from '@dxos/ai';
import { Layer, ManagedRuntime, type Runtime } from 'effect';
import { Typewriter } from './Typewriter';
import type { LanguageModel } from '@effect/ai';

const meta: Meta<typeof Typewriter> = {
  title: 'plugins/plugin-assistant/Typewriter',
  component: Typewriter,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof Typewriter>;

const sampleText = `# The Future of Artificial Intelligence

Artificial Intelligence (AI) has rapidly evolved from a theoretical concept to a transformative force reshaping industries, economies, and daily life. At its core, AI refers to the development of computer systems capable of performing tasks that typically require human intelligence, such as visual perception, speech recognition, decision-making, and language translation.

## Machine Learning and Neural Networks

The resurgence of AI in recent years is largely driven by advancements in machine learning (ML) and deep learning. Neural networks, inspired by the human brain's architecture, enable computers to learn from vast amounts of data. This has led to breakthroughs in areas like natural language processing (NLP), allowing models like GPT-4 to generate human-like text and code.

## Ethical Considerations

As AI becomes more autonomous, ethical concerns have moved to the forefront. Issues such as algorithmic bias, data privacy, and the potential displacement of jobs are critical topics of debate. Ensuring that AI systems are fair, transparent, and aligned with human values is essential for their sustainable development.

## Conclusion

The journey of AI is just beginning. With responsible innovation and global collaboration, AI has the potential to solve some of humanity's most pressing challenges, from climate change to personalized medicine.

(try selecting some text to see the AI assistant, or wait for the proofreader to find the typo below)

The quick brown fox jumps over teh lazy dog. i think this is cool.
`;

export const Default: Story = {
  render: () => {
    const [rtEffect, setRtEffect] = useState<Runtime.Runtime<LanguageModel.LanguageModel>>();
    useEffect(() => {
      let disposed = false;
      const rt = ManagedRuntime.make(
        AiService.model('@anthropic/claude-haiku-4-5').pipe(
          Layer.provide(AiServiceTestingPreset('edge-remote')),
          Layer.orDie,
        ),
      );
      queueMicrotask(async () => {
        if (disposed) return;
        const x = await rt.runtime();
        if (disposed) return;
        setRtEffect(x);
      });
      return () => {
        disposed = true;
        void rt.dispose();
      };
    }, []);

    if (!rtEffect) {
      return <div>...Loading</div>;
    }

    return (
      <div className='w-[800px] p-4'>
        <Typewriter initialContent={sampleText} runtime={rtEffect} />
      </div>
    );
  },
};
