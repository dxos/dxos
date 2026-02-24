//
// Copyright 2024 DXOS.org
//

import { type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import React, { type CSSProperties, type HTMLAttributes } from 'react';

// Tree item hitbox
// https://github.com/atlassian/pragmatic-drag-and-drop/blob/main/packages/hitbox/constellation/index/about.mdx#tree-item

type InstructionType = Exclude<Instruction, { type: 'instruction-blocked' }>['type'];
type Orientation = 'sibling' | 'child';

const edgeToOrientationMap: Record<InstructionType, Orientation> = {
  'reorder-above': 'sibling',
  'reorder-below': 'sibling',
  'make-child': 'child',
  reparent: 'child',
};

const orientationStyles: Record<Orientation, HTMLAttributes<HTMLElement>['className']> = {
  // TODO(wittjosiah): Stop using left/right here.
  sibling:
    'h-(--line-thickness) left-(--horizontal-indent) right-0 bg-accent-surface before:left-(--negative-terminal-size)',
  child: 'w-full top-0 bottom-0 border-[length:--line-thickness] before:invisible',
};

const instructionStyles: Record<InstructionType, HTMLAttributes<HTMLElement>['className']> = {
  'reorder-above': 'top-(--line-offset) before:top-(--offset-terminal)',
  'reorder-below': 'bottom-(--line-offset) before:bottom-(--offset-terminal)',
  'make-child': 'border-accent-surface',
  // TODO(wittjosiah): This is not occurring in the current implementation.
  reparent: '',
};

const strokeSize = 2;
const terminalSize = 8;
const offsetToAlignTerminalWithLine = (strokeSize - terminalSize) / 2;

export type DropIndicatorProps = {
  instruction: Instruction;
  gap?: number;
};

export const TreeDropIndicator = ({ instruction, gap = 0 }: DropIndicatorProps) => {
  const lineOffset = `calc(-0.5 * (${gap}px + ${strokeSize}px))`;
  const isBlocked = instruction.type === 'instruction-blocked';
  const desiredInstruction = isBlocked ? instruction.desired : instruction;
  const orientation = edgeToOrientationMap[desiredInstruction.type];
  if (isBlocked) {
    return null;
  }

  return (
    <div
      style={
        {
          '--line-thickness': `${strokeSize}px`,
          '--line-offset': `${lineOffset}`,
          '--terminal-size': `${terminalSize}px`,
          '--terminal-radius': `${terminalSize / 2}px`,
          '--negative-terminal-size': `-${terminalSize}px`,
          '--offset-terminal': `${offsetToAlignTerminalWithLine}px`,
          '--horizontal-indent': `${desiredInstruction.currentLevel * desiredInstruction.indentPerLevel + 4}px`,
        } as CSSProperties
      }
      className={`absolute z-10 pointer-events-none before:w-(--terminal-size) before:h-(--terminal-size) box-border before:absolute before:border-[length:--line-thickness] before:border-solid before:border-accent-surface before:rounded-full ${orientationStyles[orientation]} ${instructionStyles[desiredInstruction.type]}`}
    ></div>
  );
};
