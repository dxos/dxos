//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// Its own entry, so importing the harness never pulls the diagnostics' heavy dependencies (devtools, compute-runtime).
export {
  ConfigModule,
  DatabaseModule,
  ExecutionGraphModule,
  InvocationsModule,
  JsonModule,
  LoggingModule,
  ObjectsModule,
  ModuleRole as Role,
  RoutineModule,
  moduleSurfaces as surfaces,
} from './internal/modules/index.ts';
