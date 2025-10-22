//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface, useCapability } from '@dxos/app-framework';
import { AlertDialog, Dialog as NaturalDialog, useTranslation } from '@dxos/react-ui';
import { descriptionMessage, mx } from '@dxos/react-ui-theme';

import { MobileLayoutState } from '../capabilities';
import { meta } from '../meta';

export const Dialog = () => {
  const layout = useCapability(MobileLayoutState);

  const DialogRoot = layout.dialogType === 'alert' ? AlertDialog.Root : NaturalDialog.Root;
  const DialogOverlay = layout.dialogType === 'alert' ? AlertDialog.Overlay : NaturalDialog.Overlay;

  return (
    <DialogRoot
      modal={layout.dialogBlockAlign !== 'end'}
      open={layout.dialogOpen}
      onOpenChange={(nextOpen) => (layout.dialogOpen = nextOpen)}
    >
      {layout.dialogBlockAlign === 'end' ? (
        <Surface role='dialog' data={layout.dialogContent} limit={1} fallback={ContentError} placeholder={<div />} />
      ) : (
        <DialogOverlay
          blockAlign={layout.dialogBlockAlign}
          classNames={layout.dialogOverlayClasses}
          style={layout.dialogOverlayStyle}
        >
          <Surface role='dialog' data={layout.dialogContent} limit={1} fallback={ContentError} />
        </DialogOverlay>
      )}
    </DialogRoot>
  );
};

export const ContentError = ({ error }: { error?: Error }) => {
  const { t } = useTranslation(meta.id);
  const errorString = error?.toString() ?? '';
  return (
    <div role='none' className='overflow-auto p-8 attention-surface grid place-items-center'>
      <p
        role='alert'
        className={mx(descriptionMessage, 'break-words rounded-md p-8', errorString.length < 256 && 'text-lg')}
      >
        {error ? errorString : t('error fallback message')}
      </p>
    </div>
  );
};
