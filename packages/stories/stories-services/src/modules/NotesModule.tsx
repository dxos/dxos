//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import * as EffectEx from '@dxos/effect/EffectEx';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { NoteStore } from '../contracts/index.ts';
import { bindingLabel, useProperty, useServices, useSnapshot } from './ServicesContext.tsx';

/** Story module: the consumer's view of `NoteStore`, which it reaches only through its client. */
export const NotesModule = () => {
  const { notes } = useServices();
  const snapshot = useSnapshot();
  const count = useProperty(notes.count);
  const [items, setItems] = useState<readonly NoteStore.Note[]>([]);
  const [text, setText] = useState('Plugins share only a contract.');
  const [error, setError] = useState<string>();

  // The property is the signal to read the list again, whichever host it came from.
  useEffect(() => {
    void EffectEx.runPromise(notes.list({})).then(setItems, () => setItems([]));
  }, [notes, count]);

  const handleAdd = useCallback(() => {
    setError(undefined);
    void EffectEx.runPromise(notes.put({ text })).catch((err) => setError(String(err)));
  }, [notes, text]);

  const handleClear = useCallback(() => {
    void EffectEx.runPromise(notes.clear({})).catch((err) => setError(String(err)));
  }, [notes]);

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Notes: {count ?? '—'}</Toolbar.Text>
          <Button.Root icon='ph--plus--regular' label='Add' onClick={handleAdd} data-testid='notes-add' />
          <Button.Root icon='ph--trash--regular' label='Clear' onClick={handleClear} data-testid='notes-clear' />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='p-2 space-y-2 overflow-y-auto'>
        <p className='text-sm text-description' data-testid='notes-binding'>
          NoteStore: {bindingLabel(snapshot.bindings[NoteStore.Contract.key])}
        </p>
        <Input.Textarea rows={2} value={text} onChange={(event) => setText(event.target.value)} />
        {error && <p className='text-sm text-error-text'>{error}</p>}
        <ul className='text-sm space-y-1' data-testid='notes-list'>
          {items.map((note) => (
            <li key={note.id}>
              <span className='text-description'>{note.id}</span> {note.text}
            </li>
          ))}
        </ul>
      </Panel.Body>
    </Panel.Root>
  );
};
