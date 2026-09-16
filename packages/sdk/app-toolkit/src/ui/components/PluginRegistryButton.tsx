//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { osTranslations } from '@dxos/ui-theme';

import { SettingsOperation } from '../../operations/index.ts';
import { usePluginRegistryAvailable } from '../hooks/index.ts';

export type PluginRegistryButtonProps = Partial<Omit<ComponentPropsWithoutRef<typeof IconButton>, 'icon' | 'label'>>;

/**
 * Icon button that opens the plugin registry via {@link SettingsOperation.OpenPluginRegistry}.
 * Composable: forwards ref/props so it works on its own or as a Slot child (e.g. `Dialog.Close asChild`).
 *
 * Renders nothing in a build without the registry. A `Slot` parent needs an element child, so a
 * caller wrapping this in `asChild` must gate on {@link usePluginRegistryAvailable} itself.
 */
export const PluginRegistryButton = forwardRef<HTMLButtonElement, PluginRegistryButtonProps>(
  ({ onClick, ...props }, forwardedRef) => {
    const { t } = useTranslation(osTranslations);
    const { invokePromise } = useOperationInvoker();
    const available = usePluginRegistryAvailable();
    if (!available) {
      return null;
    }

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
