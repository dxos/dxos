//
// Copyright 2026 DXOS.org
//

// The entry point of a binary made by `deus build`: the image is a single-executable-application asset.
import { getAsset } from 'node:sea';

import { runImage } from '../kernel/run.ts';

process.exitCode = runImage(getAsset('image', 'utf8'), { args: process.argv.slice(2) }).code;
