//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { FormEvent, KeyboardEvent, useCallback, useState } from 'react';

export interface TodoItemProps {
  title: string;
  completed: boolean;
  editing?: boolean;
  onSave: (val: string) => void;
  onDestroy: () => void;
  onEdit: () => void;
  onCancel: (event: KeyboardEvent) => void;
  onToggle: () => void;
}

export const TodoItem = ({
  title,
  completed,
  editing,
  onToggle,
  onDestroy,
  onCancel,
  onEdit,
  onSave
}: TodoItemProps) => {
  const [editText, setEditText] = useState(title);

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
    setEditText(title);
  }, [setEditText, onEdit]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditText(title);
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
    <li className={cx({ completed, editing })} data-test='todo'>
      <div className='view'>
        <input className='toggle' type='checkbox' checked={completed} onChange={onToggle} data-test='todo-toggle' />
        <label onDoubleClick={() => handleEdit()}>{title}</label>
        <button className='destroy' onClick={onDestroy} data-test='destroy-button' />
      </div>
      {editing && (
        <input
          className='edit'
          value={editText}
          onBlur={() => handleSubmit()}
          onChange={(ev) => handleChange(ev)}
          onKeyDown={(ev) => handleKeyDown(ev)}
          autoFocus={true}
        />
      )}
    </li>
  );
};
