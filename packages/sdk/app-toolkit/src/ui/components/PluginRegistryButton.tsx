//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { osTranslations } from '@dxos/ui-theme';

import { SettingsOperation } from '../../operations';

export type PluginRegistryButtonProps = Partial<Omit<ComponentPropsWithoutRef<typeof IconButton>, 'icon' | 'label'>>;

/**
 * Icon button that opens the plugin registry via {@link SettingsOperation.OpenPluginRegistry}.
 * Composable: forwards ref/props so it works on its own or as a Slot child (e.g. `Dialog.Close asChild`).
 */
export const PluginRegistryButton = forwardRef<HTMLButtonElement, PluginRegistryButtonProps>(
  ({ onClick, ...props }, forwardedRef) => {
    const { t } = useTranslation(osTranslations);
    const { invokePromise } = useOperationInvoker();

    return (
      <IconButton
        {...props}
        ref={forwardedRef}
        icon='ph--squares-four--regular'
        label={t('open-plugin-registry.label')}
        onClick={(event) => {
          onClick?.(event);
          void invokePromise(SettingsOperation.OpenPluginRegistry);
        }}
      />
    );
  },
);

PluginRegistryButton.displayName = 'PluginRegistryButton';
