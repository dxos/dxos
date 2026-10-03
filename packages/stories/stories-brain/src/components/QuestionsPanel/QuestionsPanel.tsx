//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Input from '@dxos/react-ui/Input';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';

export type QuestionRow = {
  readonly id: string;
  readonly text: string;
  readonly status: 'open' | 'answered';
  readonly answer?: string;
};

export type QuestionsPanelProps = Util.ThemedClassName<{
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
      <Panel.Header>
        <Toolbar.Root>
          <Field.Root>
            <Input.Input
              placeholder='Ask a standing question…'
              value={text}
              disabled={disabled}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
            />
          </Field.Root>
          <Button.Button
            icon='ph--plus--regular'
            iconOnly
            label='Add question'
            disabled={disabled || text.trim().length === 0}
            onClick={handleAdd}
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='overflow-y-auto'>
        {questions.length === 0 ? (
          <p className='p-2 text-fg-subtle'>No questions yet.</p>
        ) : (
          <dl className='flex flex-col gap-2 p-2'>
            {questions.map((question) => (
              <div key={question.id}>
                <dt className='font-medium'>{question.text}</dt>
                <dd className={question.status === 'answered' ? '' : 'text-fg-subtle'}>{question.answer ?? 'open'}</dd>
              </div>
            ))}
          </dl>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};
