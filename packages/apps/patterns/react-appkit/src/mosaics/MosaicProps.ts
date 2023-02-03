//
// Copyright 2023 DXOS.org
//

export type MosaicType = 'shortStack' | 'longStack' | 'fullFrame' | 'stackFrames';

export interface MosaicProps {
  type: MosaicType;
}
