//
// Copyright 2026 DXOS.org
//

import { type ActionGroupBuilderFn, type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';

import { meta } from '../../meta';
import { type Model } from '../../types';

export type TemplateType = 'primitive' | 'preset';

export type TemplateDefinition = {
  id: Model.ObjectTemplate;
  label: string;
  icon: string;
};

/** All object templates: primitives and presets. */
export const templates: Record<TemplateType, TemplateDefinition[]> = {
  primitive: [
    {
      id: 'cube',
      label: 'Cube',
      icon: 'ph--cube--regular',
    },
    {
      id: 'sphere',
      label: 'Sphere',
      icon: 'ph--sphere--regular',
    },
    {
      id: 'cylinder',
      label: 'Cylinder',
      icon: 'ph--cylinder--regular',
    },
    {
      id: 'cone',
      label: 'Cone',
      icon: 'ph--triangle--regular',
    },
    {
      id: 'pyramid',
      label: 'Pyramid',
      icon: 'ph--triangle--regular',
    },
  ],
  preset: [
    {
      id: 'firetruck',
      label: 'Fire truck',
      icon: 'ph--fire-truck--regular',
    },
    {
      id: 'race',
      label: 'Race Car',
      icon: 'ph--steering-wheel--regular',
    },
    {
      id: 'taxi',
      label: 'Taxi',
      icon: 'ph--car-profile--regular',
    },
  ],
};

export type EditorActions = {
  onAdd: () => void;
  onDeleteSelected: () => void;
  onJoinSelected: () => void;
  onSubtractSelected: () => void;
  onImport: () => void;
  onExport: () => void;
};

/** Creates the object template selector with primitives and presets groups. */
export const createTemplateSelector =
  (
    selectedTemplate: Model.ObjectTemplate,
    onSelectedTemplateChange: (template: Model.ObjectTemplate) => void,
  ): ActionGroupBuilderFn =>
  (builder) => {
    const allTemplates = Object.values(templates).flat();
    const selected = allTemplates.find((t) => t.id === selectedTemplate);
    builder.group(
      'template',
      {
        label: ['template.label', { ns: meta.id }],
        icon: selected?.icon ?? 'ph--cube--regular',
        iconOnly: true,
        variant: 'dropdownMenu',
        applyActive: true,
        selectCardinality: 'single',
        value: selectedTemplate,
      } as ToolbarMenuActionGroupProperties,
      (group) => {
        let i = 0;
        for (const [type, items] of Object.entries(templates)) {
          if (i++ > 0) {
            group.separator('line');
          }
          for (const template of items) {
            group.action(
              `${type}-${template.id}`,
              {
                label: template.label,
                icon: template.icon,
                checked: template.id === selectedTemplate,
              },
              () => onSelectedTemplateChange(template.id),
            );
          }
        }
      },
    );
  };

/** Creates standalone action buttons. Actions are disabled based on selection count. */
export const createEditorActions =
  (actions: EditorActions, selectionCount: number): ActionGroupBuilderFn =>
  (builder) =>
    builder
      .action(
        'add-object',
        {
          label: ['action.add-object.label', { ns: meta.id }],
          icon: 'ph--plus--regular',
        },
        actions.onAdd,
      )
      .action(
        'delete-object',
        {
          label: ['action.delete-object.label', { ns: meta.id }],
          icon: 'ph--trash--regular',
          disabled: selectionCount === 0,
        },
        actions.onDeleteSelected,
      )
      .separator('line')
      .action(
        'join-objects',
        {
          label: ['action.join-objects.label', { ns: meta.id }],
          icon: 'ph--unite-square--regular',
          disabled: selectionCount < 2,
        },
        actions.onJoinSelected,
      )
      .action(
        'subtract-objects',
        {
          label: ['action.subtract-objects.label', { ns: meta.id }],
          icon: 'ph--subtract-square--regular',
          disabled: selectionCount < 2,
        },
        actions.onSubtractSelected,
      )
      .separator('line')
      .action(
        'import',
        {
          label: ['action.import.label', { ns: meta.id }],
          icon: 'ph--upload-simple--regular',
        },
        actions.onImport,
      )
      .action(
        'export',
        {
          label: ['action.export.label', { ns: meta.id }],
          icon: 'ph--download-simple--regular',
          disabled: selectionCount === 0,
        },
        actions.onExport,
      );
