//
// Copyright 2026 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import * as LanguageModel from '@effect/ai/LanguageModel';
import { PencilSimple, Quotes, Sparkle, TextAa } from '@phosphor-icons/react';
import * as Effect from 'effect/Effect';
import React, { useState } from 'react';

import { log } from '@dxos/log';
import { Button, Input, ThemeProvider } from '@dxos/react-ui';
import { unwrapExit } from '@dxos/effect';
import { Runtime } from 'effect';

export interface AssistantToolbarProps {
  view: EditorView;
  runtime: Runtime.Runtime<LanguageModel.LanguageModel>;
  from: number;
  to: number;
}

export const AssistantToolbar = ({ view, runtime, from, to }: AssistantToolbarProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const runEffect = async (text: string, prompt: string) => {
    setIsProcessing(true);
    try {
      const newText = unwrapExit(
        await Effect.gen(function* () {
          // Construct meaningful system prompt context
          const response = yield* LanguageModel.generateText({
            prompt: `${prompt}:\n"${text}"`,
          });
          return response.text;
        }).pipe(Runtime.runPromiseExit(runtime)),
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
    // Basic rephrase
    void runEffect(currentText, 'Re-write the following text to be more clear and concise, keep the same meaning');
  };

  const handleChangeTone = (tone: 'formal' | 'casual') => {
    void runEffect(currentText, `Rewrite the following text to be more ${tone}`);
  };

  const handleEditWithPrompt = () => {
    if (!customPrompt) return;
    void runEffect(currentText, customPrompt);
  };

  return (
    <ThemeProvider>
      <div
        className='flex flex-col gap-2 p-1.5 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 animate-in fade-in zoom-in-95 duration-150'
        onMouseDown={(e) => e.preventDefault()} // Prevent stealing focus from editor
      >
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            classNames='p-1 min-bs-0 bs-8 is-8'
            onClick={handleRegenerate}
            disabled={isProcessing}
            title='Re-generate'
          >
            <Sparkle weight={isProcessing ? 'fill' : 'regular'} className={isProcessing ? 'animate-pulse' : ''} />
          </Button>

          <div className='w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1' />

          <Button
            variant='ghost'
            classNames='p-1 min-bs-0 bs-8 is-auto gap-2 text-xs font-medium'
            onClick={() => handleChangeTone('formal')}
            disabled={isProcessing}
          >
            <Quotes /> Formal
          </Button>
          <Button
            variant='ghost'
            classNames='p-1 min-bs-0 bs-8 is-auto gap-2 text-xs font-medium'
            onClick={() => handleChangeTone('casual')}
            disabled={isProcessing}
          >
            <PencilSimple /> Casual
          </Button>

          <div className='w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1' />

          <Button
            variant='ghost'
            classNames={`p-1 min-bs-0 bs-8 is-8 ${showPromptInput ? 'bg-neutral-100 dark:bg-neutral-700' : ''}`}
            onClick={() => setShowPromptInput(!showPromptInput)}
            disabled={isProcessing}
            title='Edit with Prompt'
          >
            <TextAa />
          </Button>
        </div>

        {showPromptInput && (
          <div className='flex gap-2 p-1 pt-2 border-t border-neutral-100 dark:border-neutral-700'>
            <Input.Root>
              <Input.TextInput
                placeholder='How should I change this?'
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditWithPrompt();
                  if (e.key === 'Escape') setShowPromptInput(false);
                  e.stopPropagation(); // Stop enter from modifying editor
                }}
                autoFocus
                classNames='text-xs'
              />
            </Input.Root>
            <Button
              variant='primary'
              classNames='min-bs-0 bs-8 text-xs'
              onClick={handleEditWithPrompt}
              disabled={!customPrompt || isProcessing}
            >
              Go
            </Button>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
};
