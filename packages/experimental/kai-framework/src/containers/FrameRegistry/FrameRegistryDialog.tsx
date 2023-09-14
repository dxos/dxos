//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useFrameRegistry } from '@dxos/kai-frames';
import { Dialog } from '@dxos/react-appkit';

import { FrameRegistry } from './FrameRegistry';
import { createPath, useAppReducer, useAppRouter, useAppState } from '../../hooks';

export type FrameRegistryDialogProps = {
  open?: boolean;
  onClose: () => void;
};

export const FrameRegistryDialog = ({ open, onClose }: FrameRegistryDialogProps) => {
  const { space } = useAppRouter();
  const navigate = useNavigate();
  const { frames: activeFrames } = useAppState();
  const frameRegistry = useFrameRegistry();
  const { setActiveFrame } = useAppReducer();

  // TODO(burdon): Active should depend on objects within the Space.
  const handleSelect = (id: string) => {
    const active = !activeFrames.find((frameId) => frameId === id);
    setActiveFrame(id, active); // TODO(burdon): Reconcile with navigation.
    if (active) {
      navigate(createPath({ spaceKey: space!.key, frame: id }));
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={() => onClose()}
      title='Frame Plugins'
      closeLabel='Close'
      slots={{ content: { classNames: 'overflow-hidden max-w-full max-h-[50vh] md:max-w-[620px] md:max-h-[640px]' } }}
    >
      <FrameRegistry frames={frameRegistry.frames} selected={activeFrames ?? []} onSelect={handleSelect} />
    </Dialog>
  );
};
