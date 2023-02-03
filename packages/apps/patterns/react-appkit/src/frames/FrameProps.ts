//
// Copyright 2023 DXOS.org
//

export type FrameType = 'shortStack' | 'longStack' | 'fullFrame' | 'stackFrames';

export interface FrameProps {
  type: FrameType;
}
