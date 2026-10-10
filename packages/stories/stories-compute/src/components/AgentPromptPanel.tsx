//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, useState } from 'react';

import * as Input from '@dxos/react-ui/Input';
import * as Panel from '@dxos/react-ui/Panel';
import * as Tag from '@dxos/react-ui/Tag';

import { MAX_PROMPT_LENGTH, SAMPLE_PROMPTS, randomPrompt } from '../testing/index.ts';
import { CommandToolbar } from './CommandToolbar.tsx';
import { type LocationKind } from './types.ts';

export type AgentPromptPanelProps = {
  /** Offer EDGE as a location; otherwise every agent spawns locally. */
  edge?: boolean;
  /** False until the runtime and space exist. */
  ready?: boolean;
  error?: string;
  onCreate: (location: LocationKind, prompt: string) => void;
};

/** Spawns an agent on the typed prompt; Enter submits, Shift+Enter adds a line. */
export const AgentPromptPanel = ({ edge = false, ready = true, error, onCreate }: AgentPromptPanelProps) => {
  const [location, setLocation] = useState<LocationKind>('local');
  const [prompt, setPrompt] = useState('');
  const [placeholder, setPlaceholder] = useState(randomPrompt);
  const text = prompt.trim();

  const handleCreate = () => {
    if (!ready) {
      return;
    }
    // An empty box runs the suggestion it shows.
    onCreate(edge ? location : 'local', text || placeholder);
    setPrompt('');
    setPlaceholder(randomPrompt());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleCreate();
    }
  };

  return (
    <Panel.Root>
      <Panel.Header>
        <CommandToolbar
          edge={edge}
          disabled={!ready}
          location={location}
          onLocationChange={setLocation}
          onCreate={handleCreate}
        />
      </Panel.Header>
      <Panel.Body classNames='p-2 space-y-3 overflow-y-auto'>
        <Input.Textarea
          autoResize
          rows={4}
          maxLength={MAX_PROMPT_LENGTH}
          placeholder={placeholder}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          data-testid='agent-prompt'
        />
        <div className='flex flex-wrap gap-1'>
          {SAMPLE_PROMPTS.map((sample) => (
            <Tag.Tag key={sample} onClick={() => setPrompt(sample)}>
              {sample}
            </Tag.Tag>
          ))}
        </div>
      </Panel.Body>
      <Panel.Footer classNames='p-2 text-sm max-h-40 overflow-y-auto'>
        {!ready && <p className='text-fg-muted'>Initializing…</p>}
        {error && (
          <p className='text-error-text' data-testid='process-error'>
            {error}
          </p>
        )}
      </Panel.Footer>
    </Panel.Root>
  );
};
