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

const cx = (c: number) => c * columnWidth + columnWidth / 2;

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
  USER = 'ph--user--regular',
  USER_INTERACTION = 'ph--user-sound--regular',
  AGENT = 'ph--robot--regular',
  THINK = 'ph--brain--regular',
  LINK = 'ph--link--regular',
  TOOL = 'ph--wrench--regular',
}

const levelColors: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'text-gray-500',
  [LogLevel.DEBUG]: 'text-gray-500',
  [LogLevel.VERBOSE]: 'text-gray-500',
  [LogLevel.INFO]: 'text-green-500',
  [LogLevel.WARN]: 'text-orange-500',
  [LogLevel.ERROR]: 'text-red-500',
};

/**
 * Commit (similar to Mercurial).
 */
export type Commit = {
  id: string;
  parents?: string[];
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

type Span = {
  start: number;
  end: number;
};

export type TimelineProps = ThemedClassName<{
  branches: Branch[];
  commits: Commit[];
  showIcon?: boolean;
  debug?: boolean;
}>;

// TODO(burdon): Reuse in toolCall messages.
// TODO(burdon): Selection; Key up/down.
export const Timeline = ({ classNames, branches, commits, showIcon = true, debug = false }: TimelineProps) => {
  // NOTE: Assumes commits are in topological order.
  const getIndex = (id: string) => commits.findIndex((c) => c.id === id);
  const getBranch = (id: string) => commits.find((c) => c.id === id)?.branch;
  const getBranchIndex = (branch: string): number => branches.findIndex((b) => b.name === branch);

  const spans = useMemo(() => {
    /**
     * Create spans for each branch.
     */
    const spans = new Map<string, Span>();
    commits.forEach((commit, index) => {
      let span = spans.get(commit.branch);
      if (!span) {
        span = { start: index, end: index };
        spans.set(commit.branch, span);
      } else {
        span.end = index;
      }

      const parents = commit.parents ?? [];
      for (const parent of parents) {
        const branch = getBranch(parent);
        if (branch && branch !== commit.branch) {
          span.start = Math.min(span.start, getIndex(parent));

          // Detect merge.
          if (parents.length > 1) {
            const parentSpan = spans.get(branch);
            if (parentSpan) {
              parentSpan.end = Math.max(parentSpan.end, index);
            }
          }
        }
      }
    });

    return spans;
  }, [commits, branches]);

  const getPaths = (commit: Commit, branch: string, span: Span, index: number): string[] => {
    const parents = commit.parents ?? [];
    const commitIndex = getBranchIndex(commit.branch);
    const branchIndex = getBranchIndex(branch);

    const paths: string[] = [];

    // Vertical connectors.
    if (span.start < index && index < span.end) {
      paths.push(`M ${cx(branchIndex)} 0 l 0 ${lineHeight}`);
    } else if (commit.branch === branch && parents.length > 0) {
      paths.push(`M ${cx(branchIndex)} 0 l 0 ${lineHeight / 2}`);
    } else if (commit.branch === branch && index < span.end) {
      paths.push(`M ${cx(branchIndex)} ${lineHeight / 2} l 0 ${lineHeight}`);
    }

    // Branch.
    if (commit.branch !== branch && index === span.start) {
      paths.push(trim`
        M ${cx(commitIndex)} ${lineHeight / 2}
        L ${cx(branchIndex) - lineHeight / 2} ${lineHeight / 2}
        a ${lineHeight / 2} ${lineHeight / 2} 0 0 1 ${lineHeight / 2} ${lineHeight / 2}
      `);
    }

    // Merge.
    // TODO(burdon): Check end commit.
    if (commit.branch !== branch && index === span.end) {
      // console.log(branch, span, index);
      // for (const parent of parents) {
      //   console.log('===', parent, commit.branch, getBranch(parent), branch);
      // }

      paths.push(trim`
        M ${cx(commitIndex)} ${lineHeight / 2}
        L ${cx(branchIndex) - lineHeight / 2} ${lineHeight / 2}
        a ${lineHeight / 2} ${lineHeight / 2} -90 0 0 ${lineHeight / 2} ${-lineHeight / 2}
      `);
    }

    return paths;
  };

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
              {/* Connectors */}
              {branches.map((branch, c) => {
                const color = colors[c % colors.length];
                const span = spans.get(branch.name);
                if (!span || span.start === -1 || span.end === -1) {
                  return null;
                }

                return (
                  <Fragment key={c}>
                    {getPaths(commit, branch.name, span, index).map((path, i) => (
                      <path key={i} d={path} className={mx(lineStyle, color.stroke)} fill='none' />
                    ))}
                  </Fragment>
                );
              })}

              {/* Nodes */}
              {branches.map((branch, c) => {
                const color = colors[c % colors.length];
                return (
                  branch.name === commit.branch && (
                    <circle
                      key={c}
                      cx={cx(c)}
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
            <div className='pie-3 text-sm truncate cursor-pointer text-subdued group-hover:text-baseText'>
              {debug ? JSON.stringify({ id: commit.id, parents: commit.parents }) : commit.message}
            </div>
          </div>
        );
      })}
    </div>
  );
};
