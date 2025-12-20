//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { useObject, useObjectUpdate } from '@dxos/echo-react';

import { type Task } from './types';

export type TaskItemProps = {
  task: Task;
  index: number;
  editingTask: number | null;
  showDeleteTask: number | null;
  onEdit: (index: number | null) => void;
  onShowDelete: (index: number | null) => void;
  onRemove: (task: Task) => void;
};

export const TaskItem = (props: TaskItemProps) => {
  const { task, index, editingTask, showDeleteTask, onEdit, onShowDelete, onRemove } = props;

  // Use hooks for reactive property access
  const completed = useObject(task, 'completed');
  const title = useObject(task, 'title');
  const updateCompleted = useObjectUpdate(task, 'completed');
  const updateTitle = useObjectUpdate(task, 'title');

  const [editingValue, setEditingValue] = useState(title);

  // Sync editing value with title when title changes (but not when editing)
  useEffect(() => {
    if (editingTask !== index) {
      setEditingValue(title);
    }
  }, [title, editingTask, index]);

  const isEditing = editingTask === index;
  const isShowingDelete = showDeleteTask === index;

  return (
    <li
      className='flex items-center justify-between text-gray-700 max-is-md rounded p-1 bs-8'
      onMouseOver={() => {
        onShowDelete(index);
      }}
      onMouseLeave={() => {
        onShowDelete(null);
      }}
    >
      <input
        className='mr-2 rounded shadow hover:pointer-cursor'
        type='checkbox'
        checked={completed}
        onChange={(e) => {
          updateCompleted(e.target.checked);
        }}
      />
      <div className='hover:pointer-cursor flex-grow' onClick={() => onEdit(index)}>
        {isEditing ? (
          <span className='flex justify-between'>
            <input
              className='border-none p-0 flex-grow bg-transparent is-full'
              type='text'
              value={editingValue}
              onChange={(e) => {
                setEditingValue(e.target.value);
              }}
              onKeyUp={(e) => {
                if (e.key === 'Enter') {
                  updateTitle(editingValue);
                  onEdit(null);
                } else if (e.key === 'Escape') {
                  setEditingValue(title);
                  onEdit(null);
                }
              }}
              onBlur={() => {
                updateTitle(editingValue);
                onEdit(null);
              }}
              autoFocus
            />
          </span>
        ) : (
          title
        )}
      </div>
      {isShowingDelete && (
        <button
          className='bg-white rounded ml-2 p-0 pli-2 hover:bg-gray-100 hover:cursor-pointer shadow border border-gray-400 active:bg-gray-200'
          onClick={() => onRemove(task)}
        >
          Delete
        </button>
      )}
    </li>
  );
};
