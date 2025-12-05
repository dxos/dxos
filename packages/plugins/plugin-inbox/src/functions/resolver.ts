//
// Copyright 2025 DXOS.org
//

export type ObjectResolver<Source, Target> = (source: Source) => Promise<Target | undefined>;
