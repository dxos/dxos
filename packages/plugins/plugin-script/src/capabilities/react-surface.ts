//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type ComponentProps } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Script from '@dxos/compute/Script';

import { DeploymentDialog, ScriptProperties, TestContainer } from '#containers';
import { meta } from '#meta';
import { Notebook } from '#types';

import { DEPLOYMENT_DIALOG } from '../constants.ts';
import {
  NotebookArticleSurface,
  ScriptArticleSurface,
  ScriptLogsSurface,
  ScriptSettingsSurface,
} from './ScriptSurfaces.tsx';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: ScriptSettingsSurface,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.Root.create({
        id: 'script.article',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Script.Script),
          AppSurface.object(AppSurface.Section, Script.Script),
        ),
        component: ScriptArticleSurface,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.Root.create({
        id: 'notebook.article',
        filter: AppSurface.object(AppSurface.Article, Notebook.Notebook),
        component: NotebookArticleSurface,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.Root.create({
        id: 'objectProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Script.Script),
        component: ScriptProperties,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.Root.create({
        id: 'companion.execute',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'execute'),
          AppSurface.companion(AppSurface.Article, Script.Script),
        ),
        component: TestContainer,
        props: ({ role, data: { companionTo } }) => ({ role, script: companionTo }),
      }),
      Surface.Root.create({
        id: 'companion.logs',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'logs'),
          AppSurface.companion(AppSurface.Article, Script.Script),
        ),
        component: ScriptLogsSurface,
        props: ({ role, data: { companionTo } }) => ({ role, script: companionTo }),
      }),
      Surface.Root.create({
        id: DEPLOYMENT_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof DeploymentDialog>>(AppSurface.Dialog, DEPLOYMENT_DIALOG),
        component: DeploymentDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
    ]),
  ),
);
