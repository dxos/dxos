//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React from 'react';
import { Link } from 'react-router-dom';

import { FILTER } from '../constants';

const pluralize = (count: number, word: string) => (count === 1 ? word : word + 's');

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
      <span className='todo-count' data-testid='todo-count'>
        <strong>{count}</strong> {activeTodoWord} left
      </span>
      <ul className='filters'>
        <li>
          <Link to={generatePath()} className={cx({ selected: nowShowing === FILTER.ALL })} data-testid='all-filter'>
            All
          </Link>
        </li>
        <li>
          <Link
            to={generatePath(FILTER.ACTIVE)}
            className={cx({ selected: nowShowing === FILTER.ACTIVE })}
            data-testid='active-filter'
          >
            Active
          </Link>
        </li>
        <li>
          <Link
            to={generatePath(FILTER.COMPLETED)}
            className={cx({ selected: nowShowing === FILTER.COMPLETED })}
            data-testid='completed-filter'
          >
            Completed
          </Link>
        </li>
      </ul>
      {completedCount > 0 && (
        <button className='clear-completed' onClick={onClearCompleted} data-testid='clear-button'>
          Clear completed
        </button>
      )}
    </footer>
  );
};
