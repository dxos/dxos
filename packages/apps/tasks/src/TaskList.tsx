//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { isNonNullable } from '@dxos/util';

import { type Task } from './types';

export type TaskListProps = {
  tasks?: Task[];
  onInviteClick?: () => any;
  onTaskCreate?: (text: string) => any;
  onTaskRemove?: (task: Task) => any;
  onTaskTitleChange?: (task: Task, newTitle: string) => any;
  onTaskCheck?: (task: Task, checked: boolean) => any;
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
        className='float-right bg-white hover:bg-gray-100 text-gray-800 font-semibold plb-2 pli-4 border border-gray-400 rounded shadow active:bg-gray-200'
        onClick={onInviteClick}
      >
        Share
      </button>
      <div className='max-is-sm mx-auto'>
        <h1 className='mt-3 text-3xl font-bold leading-tight text-gray-900 mb-2'>Task List</h1>
        {tasks && (
          <ul className='mb-2'>
            {tasks.filter(isNonNullable).map((task, index) => (
              <li
                key={index}
                className='flex items-center justify-between text-gray-700 max-is-md rounded p-1 h-8'
                onMouseOver={() => {
                  setShowDeleteTask(index);
                }}
                onMouseLeave={() => {
                  setShowDeleteTask(null);
                }}
              >
                <input
                  className='mr-2 rounded shadow hover:pointer-cursor'
                  type='checkbox'
                  checked={task.completed}
                  onChange={(e) => onTaskCheck?.(task, e.target.checked)}
                />
                <div className='hover:pointer-cursor flex-grow' onClick={() => setEditingTask(index)}>
                  {editingTask === index ? (
                    <span className='flex justify-between'>
                      <input
                        className='border-none p-0 flex-grow bg-transparent is-full'
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
                    className='bg-white rounded ml-2 p-0 pli-2 hover:bg-gray-100 hover:cursor-pointer shadow border border-gray-400 active:bg-gray-200'
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
            className='mr-2 rounded shadow flex-grow plb-2 pli-4'
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
            className='bg-white hover:bg-gray-100 text-gray-800 font-semibold plb-2 pli-4 border border-gray-400 rounded shadow active:bg-gray-200'
            onClick={newTask}
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
};
