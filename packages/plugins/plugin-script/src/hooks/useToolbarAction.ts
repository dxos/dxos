//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { type ScriptType } from '@dxos/functions/types';
import { log } from '@dxos/log';
import { type MenuAction, type MenuActionHandler } from '@dxos/react-ui-menu';

import { type DeployActionProperties, useDeployHandler, useCopyHandler } from './deploy';
import { type FormatActionProperties, useFormatHandler } from './format';
import { type TemplateActionProperties, useTemplateSelectHandler } from './template';
import { type ScriptToolbarState } from './useToolbarState';

export type ScriptToolbarActionProperties = TemplateActionProperties | FormatActionProperties | DeployActionProperties;

export type ScriptToolbarAction = MenuAction<ScriptToolbarActionProperties>;

export const useToolbarAction = (props: {
  state: ScriptToolbarState;
  script: ScriptType;
}): MenuActionHandler<ScriptToolbarAction> => {
  const handleTemplateSelect = useTemplateSelectHandler(props);
  const handleFormat = useFormatHandler(props);
  const handleDeploy = useDeployHandler(props);
  const handleCopy = useCopyHandler(props);

  return useCallback<MenuActionHandler<ScriptToolbarAction>>(
    (action: ScriptToolbarAction) => {
      switch (action.properties.type) {
        case 'template':
          handleTemplateSelect(action.properties.value);
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
        default:
          log.error('Unknown action type', action);
      }
    },
    [handleTemplateSelect, handleFormat, handleDeploy, handleCopy],
  );
};
