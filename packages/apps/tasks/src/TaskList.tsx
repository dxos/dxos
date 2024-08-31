//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { nonNullable } from '@dxos/util';

import { type TaskType } from './types';

export type TaskListProps = {
  tasks?: TaskType[];
  onInviteClick?: () => any;
  onTaskCreate?: (text: string) => any;
  onTaskRemove?: (task: TaskType) => any;
  onTaskTitleChange?: (task: TaskType, newTitle: string) => any;
  onTaskCheck?: (task: TaskType, checked: boolean) => any;
};

export const TaskList = (props: TaskListProps) => {
  const { tasks, onInviteClick, onTaskCreate, onTaskRemove, onTaskTitleChange, onTaskCheck } = props;

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [showDeleteTask, setShowDeleteTask] = useState<number | null>(null);

  const newTask = () => {
    if (!newTaskTitle) {
      return;
    }
    onTaskCreate?.(newTaskTitle);
    setNewTaskTitle('');
  };

  return (
    <div className='p-2'>
      <button
        className='float-right rounded border border-gray-400 bg-white px-4 py-2 font-semibold text-gray-800 shadow hover:bg-gray-100 active:bg-gray-200'
        onClick={onInviteClick}
      >
        Share
      </button>
      <div className='mx-auto max-w-sm'>
        <h1 className='mb-2 mt-3 text-3xl font-bold leading-tight text-gray-900'>Task List</h1>
        {tasks && (
          <ul className='mb-2'>
            {tasks.filter(nonNullable).map((task, index) => (
              <li
                key={index}
                className='flex h-8 max-w-md items-center justify-between rounded p-1 text-gray-700'
                onMouseOver={() => {
                  setShowDeleteTask(index);
                }}
                onMouseLeave={() => {
                  setShowDeleteTask(null);
                }}
              >
                <input
                  className='hover:pointer-cursor mr-2 rounded shadow'
                  type='checkbox'
                  checked={task.completed}
                  onChange={(e) => onTaskCheck?.(task, e.target.checked)}
                />
                <div className='hover:pointer-cursor flex-grow' onClick={() => setEditingTask(index)}>
                  {editingTask === index ? (
                    <span className='flex justify-between'>
                      <input
                        className='w-full flex-grow border-none bg-transparent p-0'
                        type='text'
                        value={task.title}
                        onChange={(e) => {
                          onTaskTitleChange?.(task, e.target.value);
                        }}
                        onKeyUp={(e) => {
                          if (e.key === 'Enter') {
                            setEditingTask(null);
                          }
                        }}
                        autoFocus
                      />
                    </span>
                  ) : (
                    task.title
                  )}
                </div>
                {showDeleteTask === index && (
                  <button
                    className='ml-2 rounded border border-gray-400 bg-white p-0 px-2 shadow hover:cursor-pointer hover:bg-gray-100 active:bg-gray-200'
                    onClick={() => onTaskRemove?.(task)}
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className='flex items-center justify-between'>
          <input
            className='mr-2 flex-grow rounded px-4 py-2 shadow'
            type='text'
            value={newTaskTitle}
            onChange={(e) => {
              setNewTaskTitle(e.target.value);
            }}
            onKeyUp={(e) => {
              if (e.key === 'Enter') {
                newTask();
              }
            }}
          />
          <button
            className='rounded border border-gray-400 bg-white px-4 py-2 font-semibold text-gray-800 shadow hover:bg-gray-100 active:bg-gray-200'
            onClick={newTask}
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
};
