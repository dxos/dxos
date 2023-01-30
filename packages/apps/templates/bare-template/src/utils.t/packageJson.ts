//
// Copyright 2023 DXOS.org
//

import { PackageJson as _PackageJson } from 'types-package-json';

export type PackageJson = _PackageJson & { private: boolean };
