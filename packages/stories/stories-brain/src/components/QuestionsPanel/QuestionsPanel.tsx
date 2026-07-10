//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { IconButton, Input, Panel, type ThemedClassName, Toolbar } from '@dxos/react-ui';

export type QuestionRow = {
  readonly id: string;
  readonly text: string;
  readonly status: 'open' | 'answered';
  readonly answer?: string;
};

export type QuestionsPanelProps = ThemedClassName<{
  questions: readonly QuestionRow[];
  disabled?: boolean;
  onAdd: (text: string) => void;
}>;

/**
 * Standing questions column: add a question, watch it flip to answered as the crawl accumulates
 * facts. Pure/presentational — the parent owns the question store and the add handler.
 */
export const QuestionsPanel = ({ classNames, questions, disabled, onAdd }: QuestionsPanelProps) => {
  const [text, setText] = useState('');

  const handleAdd = () => {
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      onAdd(trimmed);
      setText('');
    }
  };

  return (
    <Panel.Root classNames={classNames}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Input.Root>
            <Input.TextInput
              placeholder='Ask a standing question…'
              value={text}
              disabled={disabled}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
            />
          </Input.Root>
          <IconButton
            icon='ph--plus--regular'
            iconOnly
            label='Add question'
            disabled={disabled || text.trim().length === 0}
            onClick={handleAdd}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='dx-container overflow-y-auto'>
        {questions.length === 0 ? (
          <p className='p-2 text-subdued-text'>No questions yet.</p>
        ) : (
          <dl className='flex flex-col gap-2 p-2'>
            {questions.map((question) => (
              <div key={question.id}>
                <dt className='font-medium'>{question.text}</dt>
                <dd className={question.status === 'answered' ? '' : 'text-subdued-text'}>
                  {question.answer ?? 'open'}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};
