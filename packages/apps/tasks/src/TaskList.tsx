//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { isNonNullable } from '@dxos/util';

import { TaskItem } from './TaskItem';
import { type Task } from './types';

export type TaskListProps = {
  tasks?: Task[];
  onInviteClick?: () => any;
  onTaskCreate?: (text: string) => any;
  onTaskRemove?: (task: Task) => any;
};

export const TaskList = (props: TaskListProps) => {
  const { tasks, onInviteClick, onTaskCreate, onTaskRemove } = props;

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
              <TaskItem
                key={index}
                task={task}
                index={index}
                editingTask={editingTask}
                showDeleteTask={showDeleteTask}
                onEdit={setEditingTask}
                onShowDelete={setShowDeleteTask}
                onRemove={onTaskRemove ?? (() => {})}
              />
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
