//
// Copyright 2026 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import * as LanguageModel from '@effect/ai/LanguageModel';
import { runInRuntime } from '@dxos/effect';
import { ArrowsClockwise, CaretLeft, CaretRight, Keyboard } from '@phosphor-icons/react';
import * as Effect from 'effect/Effect';
import { Runtime } from 'effect';
import React, { useState } from 'react';

import { log } from '@dxos/log';
import { Button, Input, ThemeProvider } from '@dxos/react-ui';

export interface AssistantToolbarProps {
  view: EditorView;
  from: number;
  to: number;
  runtime: Runtime.Runtime<LanguageModel.LanguageModel>;
}

export const AssistantToolbar = ({ view, from, to, runtime }: AssistantToolbarProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const runEffect = async (text: string, prompt: string) => {
    setIsProcessing(true);
    try {
      const newText = await runInRuntime(
        runtime,
        Effect.gen(function* () {
          // Construct meaningful system prompt context
          const response = yield* LanguageModel.generateText({
            prompt: `${prompt}:\n"${text}"`,
          });
          return response.text;
        }),
      );

      // Apply change - check if selection is still valid/same?
      // For simple demo, we just apply to the passed from/to, but ideally we check current selection.
      // We can just rely on from/to passed as props, assuming the toolbar unmounts if selection changes.
      view.dispatch({
        changes: { from, to, insert: newText },
      });
    } catch (e) {
      log.error('Assistant action failed', { error: e });
    } finally {
      setIsProcessing(false);
      setShowPromptInput(false);
    }
  };

  const currentText = view.state.sliceDoc(from, to);

  const handleRegenerate = () => {
    void runEffect(
      currentText,
      'You are a typewriting agent. Agent only outputs the result; one version; no explanation or formatting. Re-write the following text to be more clear and concise, keep the same meaning.',
    );
  };

  const handleCasual = () => handleChangeTone('casual');
  const handleFormal = () => handleChangeTone('formal');

  const handleChangeTone = (tone: 'formal' | 'casual') => {
    void runEffect(
      currentText,
      `You are a typewriting agent. Agent only outputs the result; one version; no explanation or formatting. Rewrite the following text to be more ${tone}`,
    );
  };

  const handleEditWithPrompt = () => {
    if (!customPrompt) return;
    void runEffect(currentText, customPrompt);
  };

  return (
    <ThemeProvider>
      {showPromptInput ? (
        <div
          className='flex items-center gap-2 p-1 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md rounded-full shadow-xl border border-neutral-200 dark:border-neutral-700 animate-in fade-in zoom-in-95 duration-150 mt-2'
          onMouseDown={(e) => e.preventDefault()}
        >
          <Input.Root>
            <Input.TextInput
              placeholder='Instruction...'
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEditWithPrompt();
                if (e.key === 'Escape') setShowPromptInput(false);
                e.stopPropagation();
              }}
              autoFocus
              classNames='border-none bg-transparent focus-visible:ring-0 p-1 text-sm min-w-[200px]'
            />
          </Input.Root>
          <Button
            variant='ghost'
            classNames='p-1 min-bs-0 bs-6 is-6 rounded-full'
            onClick={handleEditWithPrompt}
            disabled={!customPrompt || isProcessing}
          >
            <ArrowsClockwise className={isProcessing ? 'animate-spin' : ''} />
          </Button>
        </div>
      ) : (
        <div
          className='flex items-center gap-1 p-1 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-md rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 animate-in fade-in zoom-in-95 duration-150 mt-2'
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className='flex items-center gap-1'>
            <Button
              variant='ghost'
              classNames='flex flex-col items-center gap-1 p-1 h-auto w-auto rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700'
              onClick={handleCasual}
              disabled={isProcessing}
            >
              <CaretLeft size={16} />
              <span className='text-[10px] leading-none text-neutral-500 font-medium'>Casual</span>
            </Button>

            <Button
              variant='ghost'
              classNames='flex flex-col items-center gap-1 p-1 h-auto w-auto rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700'
              onClick={handleRegenerate}
              disabled={isProcessing}
            >
              <ArrowsClockwise size={16} className={isProcessing ? 'animate-spin' : ''} />
              <span className='text-[10px] leading-none text-neutral-500 font-medium'>Different</span>
            </Button>

            <Button
              variant='ghost'
              classNames='flex flex-col gap-1 p-1 h-auto w-auto rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700'
              onClick={handleFormal}
              disabled={isProcessing}
            >
              <CaretRight size={16} />
              <span className='text-[10px] leading-none text-neutral-500 font-medium'>Formal</span>
            </Button>
          </div>

          <div className='w-px h-8 bg-neutral-200 dark:bg-neutral-700 mx-1' />

          <Button
            variant='ghost'
            classNames='flex flex-col gap-1 p-1 h-auto w-auto rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700'
            onClick={() => setShowPromptInput(true)}
            disabled={isProcessing}
          >
            <Keyboard size={16} />
            <span className='text-[10px] leading-none text-neutral-500 font-medium'>Instruct</span>
          </Button>
        </div>
      )}
    </ThemeProvider>
  );
};
