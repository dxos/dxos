//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { CodeOperation } from '#types';

// BuildProject and RunBuild compile with the TypeScript compiler, which crashes workerd on load (it
// probes `__filename`), and EDGE's registry resolves every handler it lists.
export const CodeOperationHandlerSet = OperationHandlerSet.lazy([
  CodeOperation.VerifySpec.pipe(Operation.lazyHandler(() => import('./verify-spec.ts'))),
  CodeOperation.RunBuildAgent.pipe(Operation.lazyHandler(() => import('./run-build-agent.ts'))),
  CodeOperation.ListFiles.pipe(Operation.lazyHandler(() => import('./list-files.ts'))),
  CodeOperation.ReadFile.pipe(Operation.lazyHandler(() => import('./read-file.ts'))),
  CodeOperation.WriteFile.pipe(Operation.lazyHandler(() => import('./write-file.ts'))),
  CodeOperation.DeleteFile.pipe(Operation.lazyHandler(() => import('./delete-file.ts'))),
  CodeOperation.ScaffoldProject.pipe(Operation.lazyHandler(() => import('./scaffold-project.ts'))),
  CodeOperation.HelloWorld.pipe(Operation.lazyHandler(() => import('./hello-world.ts'))),
  CodeOperation.ResetProject.pipe(Operation.lazyHandler(() => import('./reset-project.ts'))),
  CodeOperation.ImportSpec.pipe(Operation.lazyHandler(() => import('./import-spec.ts'))),
  CodeOperation.ImportSpecFile.pipe(Operation.lazyHandler(() => import('./import-spec-file.ts'))),
  CodeOperation.ExportSpecFile.pipe(Operation.lazyHandler(() => import('./export-spec-file.ts'))),
  CodeOperation.ListLocalSpecs.pipe(Operation.lazyHandler(() => import('./list-local-specs.ts'))),
  CodeOperation.CreateFeature.pipe(Operation.lazyHandler(() => import('./feature/create.ts'))),
  CodeOperation.UpdateFeature.pipe(Operation.lazyHandler(() => import('./feature/update.ts'))),
  CodeOperation.DeleteFeature.pipe(Operation.lazyHandler(() => import('./feature/delete.ts'))),
  CodeOperation.CreateSpec.pipe(Operation.lazyHandler(() => import('./feature/create-spec.ts'))),
  CodeOperation.UpdateSpec.pipe(Operation.lazyHandler(() => import('./feature/update-spec.ts'))),
  CodeOperation.AddFeatureDependency.pipe(Operation.lazyHandler(() => import('./feature/add-dependency.ts'))),
  CodeOperation.RemoveFeatureDependency.pipe(Operation.lazyHandler(() => import('./feature/remove-dependency.ts'))),
  CodeOperation.LinkFeatureTask.pipe(Operation.lazyHandler(() => import('./feature/link-task.ts'))),
  CodeOperation.GetFeatures.pipe(Operation.lazyHandler(() => import('./feature/get-features.ts'))),
  CodeOperation.ImportFeatureLinks.pipe(Operation.lazyHandler(() => import('./feature/import-links.ts'))),
  CodeOperation.ImportSpecFeatures.pipe(Operation.lazyHandler(() => import('./feature/import-spec.ts'))),
  CodeOperation.ExportSpecFeatures.pipe(Operation.lazyHandler(() => import('./feature/export-spec.ts'))),
  CodeOperation.UpdateProjectRepositories.pipe(Operation.lazyHandler(() => import('./update-project-repositories.ts'))),
]);
