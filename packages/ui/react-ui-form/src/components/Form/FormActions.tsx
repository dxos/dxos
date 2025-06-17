//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';

import { useFormContext } from './FormContext';
import { translationKey } from '../../translations';

export type FormActionsProps = {
  readonly?: boolean;
  onCancel?: () => void;
};

export const FormActions = ({ readonly, onCancel }: FormActionsProps) => {
  const { t } = useTranslation(translationKey);
  const { canSave, handleSave } = useFormContext();

  return (
    <div role='none' className='flex [&_button]:grow gap-1 pli-2'>
      {onCancel && !readonly && (
        <IconButton data-testid='cancel-button' icon='ph--x--regular' label={t('button cancel')} onClick={onCancel} />
      )}
      {handleSave && (
        <IconButton
          type='submit'
          data-testid='save-button'
          disabled={!canSave}
          icon='ph--check--regular'
          label={t('button save')}
          onClick={handleSave}
        />
      )}
    </div>
  );
};
