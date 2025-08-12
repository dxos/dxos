//
// Copyright 2025 DXOS.org
//

import React, { Fragment, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type Commit = {
  id: string;
  parent?: string;
  branch: string;
  message: string;
  timestamp?: Date;
  tags?: string[];
};

export type Branch = {
  name: string;
};

export type Span = {
  start: number;
  end: number;
  parent?: number;
};

export type TimelineProps = ThemedClassName<{ branches: Branch[]; commits: Commit[] }>;

export const Timeline = ({ classNames, branches, commits }: TimelineProps) => {
  const spans = useMemo(() => {
    const spans = new Map<string, Span>();
    branches.forEach((branch) => {
      spans.set(branch.name, { start: -1, end: -1 });
    });

    commits.forEach((commit, index) => {
      const span = spans.get(commit.branch);
      if (span) {
        if (span.start === -1) {
          span.start = index;
          span.parent = branches.findIndex(
            (branch) => branch.name === commits.find((c) => c.id === commit.parent)?.branch,
          );
        }
        span.end = index;
      }
    });

    return spans;
  }, [commits, branches]);

  return (
    <div className={mx('flex flex-col w-full overflow-hidden', classNames)}>
      {commits.map((commit, index) => {
        return (
          <div key={commit.id} className='group flex items-center gap-2' style={{ height: `${lineHeight}px` }}>
            <svg width={branches.length * columnWidth} height={lineHeight}>
              {branches.map((branch, j) => {
                const span = spans.get(branch.name);
                const color = colors[j % colors.length];
                if (!span) {
                  return null;
                }

                return (
                  <Fragment key={j}>
                    {index !== 0 && span.start !== -1 && span.start < index && span.end >= index && (
                      <line
                        x1={j * columnWidth + columnWidth / 2}
                        y1={0}
                        x2={j * columnWidth + columnWidth / 2}
                        y2={lineHeight / 2}
                        className={mx('stroke-1', color.stroke)}
                      />
                    )}
                    {span.end !== -1 && span.start <= index && span.end > index && (
                      <line
                        x1={j * columnWidth + columnWidth / 2}
                        y1={lineHeight / 2}
                        x2={j * columnWidth + columnWidth / 2}
                        y2={lineHeight}
                        className={mx('stroke-1', color.stroke)}
                      />
                    )}
                    {span.start === index && span.parent !== undefined && span.parent !== -1 && (
                      <path
                        d={`M ${0.5 + span.parent * columnWidth + columnWidth / 2} 2 L ${j * columnWidth + columnWidth / 4} 2 A ${lineHeight / 4} ${lineHeight / 4} 0 0 1 ${j * columnWidth + columnWidth / 2} ${2 + lineHeight / 4}`}
                        className={mx('stroke-1', color.stroke)}
                        fill='none'
                      />
                    )}
                    {branch.name === commit.branch && (
                      <circle
                        cx={j * columnWidth + columnWidth / 2}
                        cy={lineHeight / 2}
                        r={nodeRadius}
                        className={mx('stroke-2', color.stroke, color.hover)}
                      />
                    )}
                  </Fragment>
                );
              })}
            </svg>
            <div className='text-sm truncate cursor-pointer text-subdued group-hover:text-baseText'>
              {commit.message}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const lineHeight = 24;
const columnWidth = 24;
const nodeRadius = 6;

const colors = [
  { stroke: 'stroke-orange-500', hover: 'group-hover:fill-orange-500' },
  { stroke: 'stroke-sky-500', hover: 'group-hover:fill-sky-500' },
  { stroke: 'stroke-green-500', hover: 'group-hover:fill-lime-500' },
  { stroke: 'stroke-emerald-500', hover: 'group-hover:fill-emerald-500' },
  { stroke: 'stroke-violet-500', hover: 'group-hover:fill-violet-500' },
  { stroke: 'stroke-cyan-500', hover: 'group-hover:fill-cyan-500' },
  { stroke: 'stroke-indigo-500', hover: 'group-hover:fill-indigo-500' },
  { stroke: 'stroke-teal-500', hover: 'group-hover:fill-teal-500' },
];
