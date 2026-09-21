//
// Copyright 2025 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { CodeProject, SourceFile, Spec } from '#types';

export const Schema = AppCapability.schema([Spec.Spec, CodeProject.CodeProject, SourceFile.SourceFile]);
