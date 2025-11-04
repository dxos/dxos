//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Factor out.
export const parseNumberString = (str: string): number => parseFloat(str.replace(/[^\d.]/g, ''));
