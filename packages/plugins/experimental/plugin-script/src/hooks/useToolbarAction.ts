//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type ScriptType } from '@dxos/functions/types';
import { log } from '@dxos/log';
import { DeckAction, surfaceVariant } from '@dxos/plugin-deck/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { type MenuAction, type MenuActionHandler } from '@dxos/react-ui-menu';

import { type DeployActionProperties, useDeployHandler, useCopyHandler } from './deploy';
import { type FormatActionProperties, useFormatHandler } from './format';
import { type TemplateActionProperties, useTemplateSelectHandler } from './template';
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
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  return useCallback(
    ((action: ScriptToolbarAction) => {
      switch (action.properties.type) {
        case 'view':
          void dispatch(
            createIntent(DeckAction.ChangeCompanion, {
              primary: fullyQualifiedId(props.script),
              companion: surfaceVariant('logs'),
            }),
          );
          break;
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
    }) as MenuActionHandler,
    [handleTemplateSelect, handleFormat, handleDeploy, handleCopy],
  );
};
