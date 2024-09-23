//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import {
  DensityProvider,
  ElevationProvider,
  Icon,
  type ThemedClassName,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar as NaturalToolbar,
  Tooltip,
  useTranslation,
} from '@dxos/react-ui';

import { SCRIPT_PLUGIN } from '../../meta';

export type ToolbarProps = ThemedClassName<
  {
    deployed?: boolean;
    error?: string;
    functionUrl?: string;
    onDeploy?: () => Promise<void>;
    onFormat?: () => Promise<void>;
  } & ViewSelectorProps
>;

export const Toolbar = ({
  classNames,
  deployed,
  error,
  functionUrl,
  view,
  onDeploy,
  onFormat,
  onViewChange,
}: ToolbarProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);
  const [pending, setPending] = useState(false);

  const handleCopyLink = async () => {
    if (!functionUrl) {
      return;
    }

    await navigator.clipboard.writeText(functionUrl);
  };

  const handleDeploy = async () => {
    setPending(true);
    await onDeploy?.();
    setPending(false);
  };

  // TODO(burdon): Simplify tooltips.
  // TODO(burdon): Factor out common toolbar components with sheet/editor?
  return (
    <DensityProvider density='fine'>
      <ElevationProvider elevation='chrome'>
        <NaturalToolbar.Root classNames={['p-1', classNames]} style={{ contain: 'layout' }}>
          {onFormat && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <NaturalToolbar.Button variant='ghost' onClick={onFormat}>
                  <Icon icon='ph--magic-wand--regular' size={4} />
                </NaturalToolbar.Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content>
                  <Tooltip.Arrow />
                  {t('format label')}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}

          <div role='separator' className='grow' />

          {error ? (
            <Tooltip.Root>
              <Tooltip.Trigger>
                <Icon icon='ph--warning-circle--regular' size={4} />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content>
                  <Tooltip.Arrow />
                  {error}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          ) : null}

          {functionUrl && deployed && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <NaturalToolbar.Button variant='ghost' onClick={handleCopyLink}>
                  <Icon icon='ph--link--regular' size={4} />
                </NaturalToolbar.Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content>
                  <Tooltip.Arrow />
                  {t('copy link label')}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <NaturalToolbar.Button variant='ghost' onClick={handleDeploy} disabled={pending}>
                {pending ? (
                  <Icon icon='ph--spinner--regular' size={4} classNames='animate-spin-slow' />
                ) : (
                  <Icon icon='ph--cloud-arrow-up--regular' size={4} />
                )}
              </NaturalToolbar.Button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content>
                <Tooltip.Arrow />
                {pending ? t('pending label') : t('deploy label')}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>

          <ViewSelector view={view} onViewChange={onViewChange} />
        </NaturalToolbar.Root>
      </ElevationProvider>
    </DensityProvider>
  );
};

export type ViewType = 'editor' | 'split' | 'preview';

export type ViewSelectorProps = {
  view?: ViewType;
  onViewChange?: (view: ViewType) => void;
};

export const ViewSelector = ({ view, onViewChange }: ViewSelectorProps) => {
  return (
    <ToggleGroup type='single' value={view} onValueChange={(value) => onViewChange?.(value as ViewType)}>
      <ToggleGroupItem value='editor'>
        <Icon icon='ph--code--regular' size={4} />
      </ToggleGroupItem>
      <ToggleGroupItem value='split'>
        <Icon icon='ph--square-split-vertical--regular' size={4} />
      </ToggleGroupItem>
      <ToggleGroupItem value='preview'>
        <Icon icon='ph--eye--regular' size={4} />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
