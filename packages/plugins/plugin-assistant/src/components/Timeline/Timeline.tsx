//
// Copyright 2025 DXOS.org
//

import React, { Fragment } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type Commit = {
  id: string;
  parents: string[];
  branch: string;
  message: string;
  timestamp?: Date;
  tags?: string[];
};

export type Branch = {
  name: string;
};

export type TimelineProps = ThemedClassName<{ branches: Branch[]; commits: Commit[] }>;

export const Timeline = ({ classNames, branches, commits }: TimelineProps) => {
  const getParent = () => {};

  return (
    <div className={mx('flex flex-col w-full overflow-hidden', classNames)}>
      {commits.map((commit) => (
        <div key={commit.id} className='flex items-center gap-2' style={{ height: `${lineHeight}px` }}>
          <svg width={branches.length * columnWidth} height={lineHeight}>
            {branches.map((branch, i) => (
              <Fragment key={i}>
                {branch.name === commit.branch ? (
                  <circle cx={i * columnWidth + columnWidth / 2} cy={lineHeight / 2} r={nodeRadius} fill='red' />
                ) : (
                  <line
                    x1={i * columnWidth + columnWidth / 2}
                    y1={0}
                    x2={i * columnWidth + columnWidth / 2}
                    y2={lineHeight}
                    stroke='red'
                  />
                )}
              </Fragment>
            ))}
          </svg>
          <div>{commit.message}</div>
        </div>
      ))}
    </div>
  );
};

const lineHeight = 24;
const columnWidth = 24;
const nodeRadius = 6;
