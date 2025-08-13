//
// Copyright 2025 DXOS.org
//

import React, { Fragment, useMemo } from 'react';

import { LogLevel } from '@dxos/log';
import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { trim } from '@dxos/util';

const lineHeight = 24;
const columnWidth = 24;
const nodeRadius = 5;
const lineStyle = 'stroke-1';

const colors = [
  { stroke: 'stroke-orange-500', hover: 'group-hover:fill-orange-500' },
  { stroke: 'stroke-sky-500', hover: 'group-hover:fill-sky-500' },
  { stroke: 'stroke-green-500', hover: 'group-hover:fill-green-500' },
  { stroke: 'stroke-fuchsia-500', hover: 'group-hover:fill-fuchsia-500' },
  { stroke: 'stroke-cyan-500', hover: 'group-hover:fill-cyan-500' },
  { stroke: 'stroke-emerald-500', hover: 'group-hover:fill-emerald-500' },
  { stroke: 'stroke-violet-500', hover: 'group-hover:fill-violet-500' },
  { stroke: 'stroke-teal-500', hover: 'group-hover:fill-teal-500' },
];

export enum IconType {
  // General status.
  WARN = 'ph--warning-circle--regular',
  CHECK = 'ph--check-circle--regular',
  ROCKET = 'ph--rocket--regular',
  X = 'ph--x-circle--regular',
  FLAG = 'ph--flag--regular',
  TIMER = 'ph--timer--regular',

  // Interactions.
  USER = 'ph--person-simple-circle--regular',
  USER_INTERACTION = 'ph--user-sound--regular',
  AGENT = 'ph--robot--regular',
}

const levelColors: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'text-gray-500',
  [LogLevel.DEBUG]: 'text-gray-500',
  [LogLevel.VERBOSE]: 'text-gray-500',
  [LogLevel.INFO]: 'text-green-500',
  [LogLevel.WARN]: 'text-orange-500',
  [LogLevel.ERROR]: 'text-red-500',
};

export type Commit = {
  id: string;
  parent?: string;
  branch: string;
  icon?: string;
  level?: LogLevel;
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

export type TimelineProps = ThemedClassName<{
  branches: Branch[];
  commits: Commit[];
  showIcon?: boolean;
}>;

// TODO(burdon): Reuse in toolCall messages.
// TODO(burdon): Key up/down; selected.
export const Timeline = ({ classNames, branches, commits, showIcon = true }: TimelineProps) => {
  const spans = useMemo(() => {
    const spans = new Map<string, Span>();
    branches.forEach((branch) => {
      spans.set(branch.name, { start: -1, end: -1 });
    });

    commits.forEach((commit, index) => {
      const span = spans.get(commit.branch);
      if (span) {
        if (span.start === -1) {
          const parentIndex = commit.parent ? commits.findIndex((c) => c.id === commit.parent) : 0;
          span.start = parentIndex;
          span.parent = commit.parent
            ? branches.findIndex((branch) => branch.name === commits[parentIndex].branch)
            : undefined;
        }
        span.end = index;
      }
    });

    return spans;
  }, [commits, branches]);

  return (
    <div className={mx('flex flex-col is-full', classNames)}>
      {commits.map((commit, index) => {
        return (
          <div
            key={commit.id}
            className='group flex shrink-0 items-center gap-2 overflow-hidden hover:bg-hoverSurface'
            style={{ height: `${lineHeight}px` }}
          >
            <svg width={branches.length * columnWidth} height={lineHeight} className='shrink-0'>
              {[...branches].reverse().map((branch, _j) => {
                const j = branches.length - 1 - _j;
                const span = spans.get(branch.name);
                const color = colors[j % colors.length];
                if (!span) {
                  return null;
                }

                return (
                  <Fragment key={j}>
                    {/* Upper */}
                    {index !== 0 && span.start !== -1 && span.start < index && span.end >= index && (
                      <line
                        x1={j * columnWidth + columnWidth / 2}
                        y1={0}
                        x2={j * columnWidth + columnWidth / 2}
                        y2={lineHeight / 2}
                        className={mx(lineStyle, color.stroke)}
                      />
                    )}
                    {/* Lower */}
                    {span.end !== -1 && (span.start < index || span.start === 0) && index < span.end && (
                      <line
                        x1={j * columnWidth + columnWidth / 2}
                        y1={lineHeight / 2}
                        x2={j * columnWidth + columnWidth / 2}
                        y2={lineHeight}
                        className={mx(lineStyle, color.stroke)}
                      />
                    )}
                    {/* Arc to parent */}
                    {span.start === index && span.parent !== undefined && span.parent !== -1 && (
                      <path
                        d={trim`
                          M ${0.5 + span.parent * columnWidth + columnWidth / 2} ${lineHeight / 2} 
                          L ${j * columnWidth + columnWidth / 4} ${lineHeight / 2} 
                          A ${lineHeight / 4} ${lineHeight / 4} 0 0 1 ${j * columnWidth + columnWidth / 2} ${(lineHeight * 3) / 4} 
                          L ${j * columnWidth + columnWidth / 2} ${lineHeight}
                        `}
                        className={mx(lineStyle, color.stroke)}
                        fill='none'
                      />
                    )}
                    {branch.name === commit.branch && (
                      <circle
                        cx={j * columnWidth + columnWidth / 2}
                        cy={lineHeight / 2}
                        r={nodeRadius}
                        className={mx(lineStyle, color.stroke, color.hover)}
                      />
                    )}
                  </Fragment>
                );
              })}
              {branches.map((branch, j) => {
                const color = colors[j % colors.length];
                return (
                  branch.name === commit.branch && (
                    <circle
                      key={j}
                      cx={j * columnWidth + columnWidth / 2}
                      cy={lineHeight / 2}
                      r={nodeRadius}
                      className={mx(lineStyle, color.stroke, color.hover)}
                    />
                  )
                );
              })}
            </svg>
            {showIcon && (
              <div className='flex shrink-0 w-6 justify-center'>
                {commit.icon && (
                  <Icon icon={commit.icon} classNames={mx(commit.level && levelColors[commit.level])} size={4} />
                )}
              </div>
            )}
            <div className='text-sm truncate cursor-pointer text-subdued group-hover:text-baseText'>
              {commit.message}
            </div>
          </div>
        );
      })}
    </div>
  );
};
