//
// Copyright 2024 DXOS.org
//

import { type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import React, { type HTMLAttributes, type CSSProperties } from 'react';

import { mx } from '@dxos/react-ui-theme';

export type DropIndicatorProps = {
  instruction: Instruction;
};

type InstructionType = Exclude<Instruction, { type: 'instruction-blocked' }>['type'];
type Orientation = 'sibling' | 'child';

const edgeToOrientationMap: Record<InstructionType, Orientation> = {
  'reorder-above': 'sibling',
  'reorder-below': 'sibling',
  'make-child': 'child',
  reparent: 'child',
};

const orientationStyles: Record<Orientation, HTMLAttributes<HTMLElement>['className']> = {
  sibling:
    'h-[--line-thickness] left-[--terminal-radius] right-0 left-[--horizontal-indent] bg-[--line-color] before:left-[--negative-terminal-size]',
  child: 'w-full top-0 bottom-0 border-[length:--line-thickness] before:invisible',
};

const instructionStyles: Record<InstructionType, HTMLAttributes<HTMLElement>['className']> = {
  'reorder-above': 'top-[--line-offset] before:top-[--offset-terminal]',
  'reorder-below': 'bottom-[--line-offset] before:bottom-[--offset-terminal]',
  'make-child': 'border-[--line-color]',
  // TODO(wittjosiah): This is not occurring in the current implementation.
  reparent: '',
};

const strokeSize = 2;
const terminalSize = 8;
const offsetToAlignTerminalWithLine = (strokeSize - terminalSize) / 2;
const gap = '0px';

export const DropIndicator = ({ instruction }: DropIndicatorProps) => {
  const lineOffset = `calc(-0.5 * (${gap} + ${strokeSize}px))`;
  const isBlocked = instruction.type === 'instruction-blocked';
  const desiredInstruction = isBlocked ? instruction.desired : instruction;
  const orientation = edgeToOrientationMap[desiredInstruction.type];

  return (
    <div
      style={
        {
          '--line-thickness': `${strokeSize}px`,
          '--line-offset': `${lineOffset}`,
          '--line-color': isBlocked ? 'var(--dx-blocked)' : 'var(--dx-accentSurface)',
          '--terminal-size': `${terminalSize}px`,
          '--terminal-radius': `${terminalSize / 2}px`,
          '--negative-terminal-size': `-${terminalSize}px`,
          '--offset-terminal': `${offsetToAlignTerminalWithLine}px`,
          '--horizontal-indent': `${desiredInstruction.currentLevel * desiredInstruction.indentPerLevel}px`,
        } as CSSProperties
      }
      className={mx(
        'absolute z-10 pointer-events-none',
        "before:content-[''] before:w-[--terminal-size] before:h-[--terminal-size] box-border before:absolute",
        'before:border-[length:--line-thickness] before:border-solid before:border-blue-700 before:rounded-full',
        orientationStyles[orientation],
        instructionStyles[desiredInstruction.type],
      )}
    ></div>
  );
};
