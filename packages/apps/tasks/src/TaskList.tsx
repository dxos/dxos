//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { ShellLayout } from '@dxos/react-client';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useShell } from '@dxos/react-shell';

import { Task } from './proto';

export const TaskList = () => {
  useIdentity({ login: true });
  const space = useSpace(); // What should the pattern be for find-or-create a space?
  const shell = useShell();
  const tasks = useQuery<Task>(space, Task.filter());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [showDeleteTask, setShowDeleteTask] = useState<number | null>(null);

  const handleNewTask = () => {
    if (!space || newTaskTitle === '') {
      return;
    }
    if (!space) {
      return;
    }

    const task = new Task({ title: newTaskTitle, completed: false });
    space.db.add(task);
    setNewTaskTitle('');
  };

  return (
    <div className='p-2'>
      <button
        className='float-right bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow'
        onClick={() => shell.setLayout(ShellLayout.SPACE_INVITATIONS, space?.key && { spaceKey: space.key })}
      >
        Invite
      </button>
      <div className='max-w-sm mx-auto'>
        <h1 className='mt-3 text-3xl font-bold leading-tight text-gray-900 mb-2'>Task List</h1>
        {tasks && (
          <ul className='mb-2'>
            {tasks.map((task, index) => (
              <li
                key={index}
                className='flex items-center justify-between text-gray-700 max-w-md rounded p-1 h-8'
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
                  onChange={() => (task.completed = !task.completed)}
                />
                <div
                  className='hover:pointer-cursor flex-grow'
                  onClick={() => {
                    console.log('editing task', index);
                    setEditingTask(index);
                  }}
                >
                  {editingTask === index ? (
                    <span className='flex justify-between'>
                      <input
                        className='border-none p-0 flex-grow bg-transparent w-full'
                        type='text'
                        value={task.title}
                        onChange={(e) => {
                          task.title = e.target.value;
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
                    className='bg-white rounded ml-2 p-0 px-2 hover:bg-gray-100 hover:cursor-pointer shadow border border-gray-400'
                    onClick={(e) => {
                      e.stopPropagation();
                      space?.db.remove(task);
                    }}
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
            className='mr-2 rounded shadow flex-grow py-2 px-4'
            type='text'
            value={newTaskTitle}
            onChange={(e) => {
              setNewTaskTitle(e.target.value);
            }}
            onKeyUp={(e) => {
              if (e.key === 'Enter') {
                handleNewTask();
              }
            }}
          />
          <button
            className='bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow'
            onClick={handleNewTask}
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
};
