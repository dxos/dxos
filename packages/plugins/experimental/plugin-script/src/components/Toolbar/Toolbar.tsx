//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import {
  DensityProvider,
  ElevationProvider,
  Icon,
  Select,
  type ThemedClassName,
  ToggleGroup,
  ToggleGroupItem,
  type ToolbarButtonProps,
  Toolbar as NaturalToolbar,
  Tooltip,
  useTranslation,
} from '@dxos/react-ui';

import { SCRIPT_PLUGIN } from '../../meta';
import { type Template } from '../../templates';

export type ToolbarProps = ThemedClassName<
  {
    deployed?: boolean;
    error?: string;
    functionUrl?: string;
    onDeploy?: () => Promise<void>;
    onFormat?: () => Promise<void>;
  } & TemplateSelectProps &
    ViewSelectorProps
>;

export const Toolbar = ({
  classNames,
  deployed,
  error,
  functionUrl,
  view,
  templates,
  onDeploy,
  onFormat,
  onViewChange,
  onTemplateSelect,
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
    if (!pending) {
      setPending(true);
      await onDeploy?.();
      setPending(false);
    }
  };

  // TODO(burdon): Factor out common toolbar components with sheet/editor?
  return (
    <DensityProvider density='fine'>
      <ElevationProvider elevation='chrome'>
        <NaturalToolbar.Root classNames={['p-1', classNames]} style={{ contain: 'layout' }}>
          {templates && <TemplateSelect templates={templates} onTemplateSelect={onTemplateSelect} />}
          {onFormat && <ToolbarIconButton icon='ph--magic-wand--regular' text={t('format label')} onClick={onFormat} />}

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
            <ToolbarIconButton icon='ph--link--regular' text={t('copy link label')} onClick={handleCopyLink} />
          )}

          {onDeploy && (
            <ToolbarIconButton
              icon={pending ? 'ph--spinner-gap--regular' : 'ph--cloud-arrow-up--regular'}
              classNames={[pending && 'animate-spin']}
              text={pending ? t('pending label') : t('deploy label')}
              onClick={handleDeploy}
            />
          )}

          <ViewSelector view={view} onViewChange={onViewChange} />
        </NaturalToolbar.Root>
      </ElevationProvider>
    </DensityProvider>
  );
};

const ToolbarIconButton = ({
  icon,
  text,
  classNames,
  disabled,
  onClick,
}: { icon: string; text: string } & Pick<ToolbarButtonProps, 'classNames' | 'disabled' | 'onClick'>) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <NaturalToolbar.Button variant='ghost' disabled={disabled} onClick={onClick}>
          <Icon icon={icon} size={4} classNames={classNames} />
        </NaturalToolbar.Button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content>
          <Tooltip.Arrow />
          {text}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

export type ViewType = 'editor' | 'split' | 'preview';

export type TemplateSelectProps = {
  templates?: Template[];
  onTemplateSelect?: (id: string) => void;
};

export const TemplateSelect = ({ templates = [], onTemplateSelect }: TemplateSelectProps) => {
  return (
    <Select.Root value={''} onValueChange={onTemplateSelect}>
      <Select.TriggerButton />
      <Select.Portal>
        <Select.Content>
          <Select.Viewport>
            <Select.Option value={''}>Template</Select.Option>
            {templates.map(({ id, name }) => (
              <Select.Option key={id} value={id}>
                {name}
              </Select.Option>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};

export type ViewSelectorProps = {
  view?: ViewType;
  onViewChange?: (view: ViewType) => void;
};

export const ViewSelector = ({ view, onViewChange }: ViewSelectorProps) => {
  return (
    <ToggleGroup type='single' value={view} onValueChange={(value) => onViewChange?.(value as ViewType)}>
      <ToggleGroupItem value='editor' classNames='bg-transparent text-subdued'>
        <Icon icon='ph--code--regular' size={4} />
      </ToggleGroupItem>
      <ToggleGroupItem value='split' classNames='bg-transparent text-subdued'>
        <Icon icon='ph--square-split-vertical--regular' size={4} />
      </ToggleGroupItem>
      <ToggleGroupItem value='preview' classNames='bg-transparent text-subdued'>
        <Icon icon='ph--eye--regular' size={4} />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
