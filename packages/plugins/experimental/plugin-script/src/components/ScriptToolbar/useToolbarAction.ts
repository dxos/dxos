//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { type ScriptType } from '@dxos/functions';
import { type MenuAction, type MenuActionHandler } from '@dxos/react-ui-menu';

import { type DeployActionProperties, useDeployHandler, useCopyHandler } from './deploy';
import { type FormatActionProperties, useFormatHandler } from './format';
import { type TemplateActionProperties, useTemplateSelectHandler } from './templateSelect';
import { type ScriptToolbarState } from './useToolbarState';
import { type ViewActionProperties } from './view';

export type ScriptToolbarActionProperties =
  | TemplateActionProperties
  | ViewActionProperties
  | FormatActionProperties
  | DeployActionProperties;

export type ScriptToolbarAction = MenuAction<ScriptToolbarActionProperties>;

export const useToolbarAction = (props: { state: ScriptToolbarState; script: ScriptType }) => {
  const handleTemplateSelect = useTemplateSelectHandler(props);
  const handleFormat = useFormatHandler(props);
  const handleDeploy = useDeployHandler(props);
  const handleCopy = useCopyHandler(props);
  return useCallback(
    ((action: ScriptToolbarAction) => {
      switch (action.properties.type) {
        case 'template':
          handleTemplateSelect(action.properties.value);
          break;
        case 'view':
          props.state.view = action.properties.value;
          break;
        case 'format':
          void handleFormat();
          break;
        case 'deploy':
          void handleDeploy();
          break;
        case 'copy':
          void handleCopy();
          break;
      }
    }) as MenuActionHandler,
    [handleTemplateSelect, handleFormat, handleDeploy, handleCopy],
  );
};
