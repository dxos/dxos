//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { LogLevel } from '@dxos/log';
import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { trim } from '@dxos/util';

// TODO(burdon): Remove?
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

/**
 * Mercurial-style Commit.
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

export type TimelineProps = ThemedClassName<{
  /** Optional whitelist. */
  branches?: string[];
  commits: Commit[];
  showIcon?: boolean;
  debug?: boolean;
}>;

// TODO(burdon): Selection; Key up/down.
// TODO(burdon): Reuse in toolCall messages.
export const Timeline = ({
  classNames,
  branches: _branches,
  commits,
  showIcon = true,
  debug = false,
}: TimelineProps) => {
  // Auto-discover branches if not provided.
  const branches = useMemo(() => {
    if (_branches) {
      return _branches;
    }

    return commits.reduce((branches, commit) => {
      if (!branches.includes(commit.branch)) {
        branches.push(commit.branch);
      }

      return branches;
    }, [] as string[]);
  }, [_branches, commits]);

  // NOTE: Assumes commits are in topological order.
  const getCommitIndex = (id: string) => commits.findIndex((c) => c.id === id);
  const getBranchIndex = (branch: string): number => branches.findIndex((b) => b === branch);
  const getBranch = (id: string) => commits.find((c) => c.id === id)?.branch;

  /**
   * Create spans for each branch.
   */
  const spans = useMemo(() => {
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
          span.start = Math.min(span.start, getCommitIndex(parent));

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

  return (
    <div className={mx('flex flex-col is-full', classNames)}>
      {commits.map((commit, index) => {
        // TODO(burdon): Skip branches from branches that are not whitelisted.
        const idx = getBranchIndex(commit.branch);
        if (idx === -1) {
          return null;
        }

        return (
          <div
            key={commit.id}
            className='group flex shrink-0 items-center gap-2 overflow-hidden hover:bg-hoverSurface'
            style={{ height: `${lineHeight}px` }}
          >
            <div className='flex shrink-0'>
              <LineVector branches={branches} spans={spans} commit={commit} index={index} />
            </div>
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

type Span = {
  start: number;
  end: number;
};

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

const levelColors: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'text-gray-500',
  [LogLevel.DEBUG]: 'text-gray-500',
  [LogLevel.VERBOSE]: 'text-gray-500',
  [LogLevel.INFO]: 'text-green-500',
  [LogLevel.WARN]: 'text-orange-500',
  [LogLevel.ERROR]: 'text-red-500',
};

/**
 * SVG for node and connector paths.
 */
const LineVector = ({
  branches,
  spans,
  commit,
  index,
}: {
  branches: readonly string[];
  spans: Map<string, Span>;
  commit: Commit;
  index: number;
}) => {
  const halfHeight = lineHeight / 2;
  const getBranchIndex = (branch: string): number => branches.findIndex((b) => b === branch);

  // Create connector path.
  const createPath = (commit: Commit, branch: string, span: Span, index: number): string | undefined => {
    const parents = commit.parents ?? [];
    const commitIndex = getBranchIndex(commit.branch);
    const branchIndex = getBranchIndex(branch);

    // Vertical connectors.
    if (span.start < index && index < span.end) {
      return `M ${cx(branchIndex)} 0 l 0 ${lineHeight}`;
    } else if (commit.branch === branch && parents.length > 0) {
      return `M ${cx(branchIndex)} 0 l 0 ${halfHeight}`;
    } else if (commit.branch === branch && index < span.end) {
      return `M ${cx(branchIndex)} ${halfHeight} l 0 ${lineHeight}`;
    }

    // TODO(burdon): Assumes can only branch to the right.

    // Branch.
    if (commit.branch !== branch && index === span.start) {
      return trim`
        M ${cx(commitIndex)} ${halfHeight}
        L ${cx(branchIndex) - halfHeight} ${halfHeight}
        a ${halfHeight} ${halfHeight} 0 0 1 ${halfHeight} ${halfHeight}
      `;
    }

    // Merge.
    if (commit.branch !== branch && index === span.end) {
      return trim`
        M ${cx(commitIndex)} ${halfHeight}
        L ${cx(branchIndex) - halfHeight} ${halfHeight}
        a ${halfHeight} ${halfHeight} -90 0 0 ${halfHeight} ${-halfHeight}
      `;
    }
  };

  const col = branches.findIndex((branch) => branch === commit.branch);
  const color = colors[col % colors.length];

  return (
    <svg width={branches.length * columnWidth} height={lineHeight}>
      {/* Connectors */}
      {branches.map((branch, col) => {
        const color = colors[col % colors.length];
        const span = spans.get(branch);
        const path = span && createPath(commit, branch, span, index);
        if (!path) {
          return null;
        }

        return <path key={col} d={path} className={mx(lineStyle, color.stroke, 'fill-none')} />;
      })}

      {/* Node */}
      <circle cx={cx(col)} cy={halfHeight} r={nodeRadius} className={mx(lineStyle, color.stroke, color.hover)} />
    </svg>
  );
};
