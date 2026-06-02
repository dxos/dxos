//
// Copyright 2024 DXOS.org
//

export * from './base';
export * from './entity';
// NOTE: `./meta` is intentionally NOT re-exported here. It depends on the Ref schema (`Ref/ref`),
// which transitively pulls in `Annotation` + `Database`; re-exporting it from this low-level barrel
// — imported by `Annotation/util`, `Annotation/annotations`, `Entity/type-uri`, and `Ref/ref` —
// would create an eval-order cycle (TDZ on `createAnnotationHelper`). Import meta from `./meta`
// directly, or from the top-level `@dxos/echo/internal` barrel (re-exported there after Ref loads).
export * from './model-symbols';
export * from './typename';
export * from './version';
