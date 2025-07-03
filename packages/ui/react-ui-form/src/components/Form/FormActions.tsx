//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import { cardSpacing } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';

import { useFormContext } from './FormContext';
import { translationKey } from '../../translations';

export type FormOuterSpacing = boolean | 'blockStart-0' | 'scroll-fields';

export type FormActionsProps = {
  readonly?: boolean;
  onCancel?: () => void;
  outerSpacing?: FormOuterSpacing;
};

export const FormActions = ({ readonly, onCancel, outerSpacing = true }: FormActionsProps) => {
  const { t } = useTranslation(translationKey);
  const { canSave, handleSave } = useFormContext();

  return (
    <div
      role='none'
      className={mx(
        outerSpacing === 'scroll-fields'
          ? 'pli-cardSpacingInline mbe-cardSpacingBlock'
          : outerSpacing
            ? cardSpacing
            : 'mbs-cardSpacingBlock',
        'flex [&_button]:grow gap-1 first:mbs-0',
      )}
    >
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
