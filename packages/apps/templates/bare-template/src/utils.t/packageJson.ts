//
// Copyright 2023 DXOS.org
//

import { type PackageJson as _PackageJson } from 'types-package-json';

export type PackageJson = _PackageJson & { private: boolean };
