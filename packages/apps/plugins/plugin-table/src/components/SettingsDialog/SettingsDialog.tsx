//
// Copyright 2023 DXOS.org
//

import React, { type FC, type PropsWithChildren, useEffect, useRef } from 'react';

import { Button, Dialog, type DialogRootProps } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type SettingsDialogProps = {
  title: string;
  className?: string;
  onClose?: (success: boolean) => void;
} & Pick<DialogRootProps, 'open' | 'children'>;

// TODO(burdon): Factor out styles instead of wrapping?
export const SettingsDialog: FC<SettingsDialogProps> = ({ title, className, open, children, onClose }) => {
  const success = useRef(false);
  useEffect(() => {
    success.current = false;
  }, [open]);

  // TODO(burdon): Prevent close by clicking away.
  return (
    <Dialog.Root modal={true} open={open} onOpenChange={() => onClose?.(success.current)}>
      <Dialog.Overlay>
        <Dialog.Content>
          <Dialog.Title>{title}</Dialog.Title>
          <div className={mx('flex flex-col py-4', className)}>{children}</div>
          <ButtonBar>
            <Dialog.Close
              asChild
              onClick={() => {
                success.current = true;
              }}
            >
              <Button variant='primary'>Done</Button>
            </Dialog.Close>
            <Button onClick={() => onClose?.(false)}>Cancel</Button>
          </ButtonBar>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

const ButtonBar = ({ children }: PropsWithChildren) => {
  return (
    <div className='flex justify-center'>
      <div className='flex gap-4'>{children}</div>
    </div>
  );
};
