//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';

import { CodeArticle, CodeSettings } from '#containers';
import { meta } from '#meta';
import { CodeProject, Settings, Spec } from '#types';

const CodeProjectArticle = ({
  role,
  subject: project,
  attendableId,
}: {
  role: string;
  subject: CodeProject.CodeProject;
  attendableId?: string;
}) => {
  // Subscribe so the Ref resolves reactively.
  useObject(project.spec);
  const spec = project.spec.target;
  if (!spec) {
    return null;
  }
  return <CodeArticle role={role} subject={spec} attendableId={attendableId ?? project.id} />;
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'code-article',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        role: ['article', 'section', 'slide'],
        filter: (data): data is { subject: Spec.Spec; attendableId?: string } =>
          Obj.instanceOf(Spec.Spec, data.subject) &&
          (data.attendableId === undefined || typeof data.attendableId === 'string'),
        component: ({ data: { subject, attendableId }, role }) => (
          <CodeArticle role={role} subject={subject} attendableId={attendableId} />
        ),
      }),
      Surface.create({
        id: 'code-project-article',
        role: ['article', 'section', 'slide'],
        filter: (data): data is { subject: CodeProject.CodeProject; attendableId?: string } =>
          Obj.instanceOf(CodeProject.CodeProject, data.subject) &&
          (data.attendableId === undefined || typeof data.attendableId === 'string'),
        component: ({ data: { subject, attendableId }, role }) => (
          <CodeProjectArticle role={role} subject={subject} attendableId={attendableId} />
        ),
      }),
      Surface.create({
        id: 'code-settings',
        filter: AppSurface.settings(AppSurface.Article, meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <CodeSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
