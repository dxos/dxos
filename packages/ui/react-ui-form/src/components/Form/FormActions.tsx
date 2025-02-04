//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useFormContext } from './FormContext';
import { translationKey } from '../../translations';

export type FormActionsProps = {
  readonly?: boolean;
  onCancel?: () => void;
};

export const FormActions = ({ onCancel, readonly }: FormActionsProps) => {
  const { t } = useTranslation(translationKey);
  const { canSave, handleSave } = useFormContext();

  return (
    <div role='none' className='flex justify-center'>
      <div role='none' className={mx(onCancel && !readonly && 'grid grid-cols-2 gap-2')}>
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
    </div>
  );
};
