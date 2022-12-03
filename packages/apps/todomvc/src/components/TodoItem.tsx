//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { FormEvent, KeyboardEvent, useCallback, useState } from 'react';

import { Todo } from '../model';

export interface TodoItemProps {
  key: string;
  todo: Todo;
  editing?: boolean;
  onSave: (val: any) => void;
  onDestroy: () => void;
  onEdit: () => void;
  onCancel: (event: any) => void;
  onToggle: () => void;
}

export const TodoItem = ({ todo, editing, onToggle, onDestroy, onCancel, onEdit, onSave }: TodoItemProps) => {
  const [editText, setEditText] = useState(todo.title ?? '');

  const handleSubmit = useCallback(() => {
    const val = editText.trim();
    if (val) {
      onSave(val);
      setEditText(val);
    } else {
      onDestroy();
    }
  }, [editText, setEditText, onSave, onDestroy]);

  const handleEdit = useCallback(() => {
    onEdit();
    setEditText(todo.title);
  }, [setEditText, onEdit]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditText(todo.title);
        onCancel(event);
      } else if (event.key === 'Enter') {
        handleSubmit();
      }
    },
    [setEditText, onCancel, handleSubmit]
  );

  const handleChange = useCallback(
    (event: FormEvent) => {
      const input: any = event.target;
      setEditText(input.value);
    },
    [setEditText]
  );

  return (
    <li className={cx({ completed: todo.completed, editing })}>
      <div className='view'>
        <input className='toggle' type='checkbox' checked={todo.completed ?? false} onChange={onToggle} />
        <label onDoubleClick={() => handleEdit()}>{todo.title}</label>
        <button className='destroy' onClick={onDestroy} />
      </div>
      <input
        className='edit'
        value={editText}
        onBlur={() => handleSubmit()}
        onChange={(ev) => handleChange(ev)}
        onKeyDown={(ev) => handleKeyDown(ev)}
      />
    </li>
  );
};
