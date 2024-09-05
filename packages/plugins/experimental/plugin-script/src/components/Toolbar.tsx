//
// Copyright 2024 DXOS.org
//

import { Check, Checks, CircleNotch, Link, PencilSimple, UploadSimple, WarningCircle, X } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';

import {
  Button,
  DensityProvider,
  ElevationProvider,
  Input,
  Toolbar as NaturalToolbar,
  Tooltip,
  useTranslation,
} from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { SCRIPT_PLUGIN } from '../meta';

export type ToolbarProps = {
  binding: string;
  onBindingChange: (binding: string) => void;
  deployed?: boolean;
  onDeploy?: () => Promise<void>;
  functionUrl?: string;
  error?: string;
};

export const Toolbar = ({
  binding: _binding,
  onBindingChange,
  deployed,
  onDeploy,
  functionUrl,
  error,
}: ToolbarProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [binding, setBinding] = useState(_binding);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing && _binding !== binding) {
      setBinding(_binding);
    }
  }, [_binding]);

  const handleEdit = () => {
    setEditing(true);
    inputRef.current?.focus();
  };

  const handleSave = () => {
    setEditing(false);
    onBindingChange(binding);
  };

  const handleCancel = () => {
    setEditing(false);
  };

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

  return (
    <DensityProvider density='fine'>
      <ElevationProvider elevation='chrome'>
        <NaturalToolbar.Root
          classNames='p-1 is-full shrink-0 overflow-x-auto overflow-y-hidden'
          style={{ contain: 'layout' }}
        >
          {/* TODO(wittjosiah): Binding input shouldn't be in the toolbar. */}
          <Input.Root>
            <Input.Label>{t('binding label')}</Input.Label>
            <Input.TextInput
              ref={inputRef}
              classNames='!is-auto'
              disabled={!editing}
              value={binding}
              onChange={(event) => setBinding(event.target.value.toUpperCase())}
            />
            {editing ? (
              <>
                <Button variant='ghost' onClick={handleCancel}>
                  <X className={getSize(4)} />
                </Button>
                <Button variant='ghost' onClick={handleSave}>
                  <Check className={getSize(4)} />
                </Button>
              </>
            ) : (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <Button variant='ghost' onClick={handleEdit}>
                    <PencilSimple className={getSize(4)} />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content>
                    <Tooltip.Arrow />
                    {t('edit binding label')}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            )}
          </Input.Root>
          <div role='separator' className='grow' />
          {/* TODO(wittjosiah): Better treatment for status indicators in toolbar? */}
          {error ? (
            <Tooltip.Root>
              <Tooltip.Trigger>
                <WarningCircle className={getSize(4)} />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content>
                  <Tooltip.Arrow />
                  {error}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          ) : deployed ? (
            <Tooltip.Root>
              <Tooltip.Trigger>
                <Checks className={getSize(4)} />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content>
                  <Tooltip.Arrow />
                  {t('deployed label')}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          ) : null}
          {functionUrl && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <NaturalToolbar.Button variant='ghost' onClick={handleCopyLink}>
                  <Link className={getSize(4)} />
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
                  <CircleNotch className={mx('spinner', getSize(4))} />
                ) : (
                  <UploadSimple className={getSize(4)} />
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
        </NaturalToolbar.Root>
      </ElevationProvider>
    </DensityProvider>
  );
};
