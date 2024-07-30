//
// Copyright 2023 DXOS.org
//

import { compress, decompress } from 'compress-json';

export const compressSchema = (data: any): any => compress(data);

export const decompressSchema = (data: any): any => decompress(data);
