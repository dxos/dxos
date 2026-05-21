//
// Copyright 2025 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { CodeProject, SourceFile, Spec } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Spec.Spec)]: {
        'typename.label': 'Spec',
        'typename.label_zero': 'Specs',
        'typename.label_one': 'Spec',
        'typename.label_other': 'Specs',
        'object-name.placeholder': 'New spec',
        'add-object.label': 'Add spec',
        'rename-object.label': 'Rename spec',
        'delete-object.label': 'Delete spec',
        'object-deleted.label': 'Spec deleted',
      },
      [Type.getTypename(CodeProject.CodeProject)]: {
        'typename.label': 'Code Project',
        'typename.label_zero': 'Code Projects',
        'typename.label_one': 'Code Project',
        'typename.label_other': 'Code Projects',
        'object-name.placeholder': 'New code project',
        'add-object.label': 'Add code project',
        'rename-object.label': 'Rename code project',
        'delete-object.label': 'Delete code project',
        'object-deleted.label': 'Code project deleted',
      },
      [Type.getTypename(SourceFile.SourceFile)]: {
        'typename.label': 'Source File',
        'typename.label_zero': 'Source Files',
        'typename.label_one': 'Source File',
        'typename.label_other': 'Source Files',
        'object-name.placeholder': 'New source file',
      },
      [meta.id]: {
        'plugin.name': 'Code',
        'code-projects-section.label': 'Code Projects',
        'spec.label': 'Spec',
        'plugin-spec.label': 'Specification',
        'build.label': 'Build',
        'view.code.placeholder': 'Build output will appear here.',
        'browse-pane.label': 'Browse',
        'inspect-pane.label': 'Inspect',
        'output-pane.label': 'Output',
        'view.code.empty.placeholder': 'No files yet. Ask the Coder to scaffold a project.',
        'api-key.label': 'Anthropic API key',
        'api-key.empty.placeholder': 'sk-ant-…',
        'api-key.set.placeholder': '•••• (set)',
        'api-key.save.label': 'Save',
        'api-key.clear.label': 'Clear',
        'endpoint.label': 'Build service endpoint',
        'endpoint.placeholder': 'Default',
        'action.build.label': 'Build',
        'action.run.label': 'Run',
        'action.build.busy.label': 'Building…',
        'action.run.busy.label': 'Running…',
        'diagnostics.empty.placeholder': 'No build yet. Press Build to compile the project.',
        'diagnostics.section.label': 'Diagnostics',
        'console.section.label': 'Console',
        'console.empty.placeholder': 'No output. Press Run after a clean build.',
        'build.failed.label': 'Build failed',
        'build.clean.label': 'Build clean',
        'run.failed.label': 'Runtime error',
      },
    },
  },
] as const satisfies Resource[];
