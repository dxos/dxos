//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React from 'react';
import { Link } from 'react-router-dom';

import { ALL_TODOS, ACTIVE_TODOS, COMPLETED_TODOS } from '../model';

const pluralize = (count: number, word: string) => {
  return count === 1 ? word : word + 's';
};

export interface TodoFooterProps {
  completedCount: number;
  onClearCompleted: any;
  nowShowing: string;
  count: number;
  generatePath: (state?: string) => string;
}

export const TodoFooter = ({ nowShowing, count, completedCount, generatePath, onClearCompleted }: TodoFooterProps) => {
  const activeTodoWord = pluralize(count, 'item');

  return (
    <footer className='footer'>
      <span className='todo-count'>
        <strong>{count}</strong> {activeTodoWord} left
      </span>
      <ul className='filters'>
        <li>
          <Link to={generatePath()} className={cx({ selected: nowShowing === ALL_TODOS })}>
            All
          </Link>
        </li>
        <li>
          <Link to={generatePath(ACTIVE_TODOS)} className={cx({ selected: nowShowing === ACTIVE_TODOS })}>
            Active
          </Link>
        </li>
        <li>
          <Link to={generatePath(COMPLETED_TODOS)} className={cx({ selected: nowShowing === COMPLETED_TODOS })}>
            Completed
          </Link>
        </li>
      </ul>
      {completedCount > 0 && (
        <button className='clear-completed' onClick={onClearCompleted}>
          Clear completed
        </button>
      )}
    </footer>
  );
};
