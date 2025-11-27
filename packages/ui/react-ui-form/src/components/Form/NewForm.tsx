//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import type * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useState } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type MakeOptional } from '@dxos/util';

import { type FormHandler } from '../../hooks';
import { translationKey } from '../../translations';

//
// Context
//

type NewFormContextValue<T extends AnyProperties = any> = {
  /**
   * Show debug info.
   */
  debug?: boolean;

  /**
   * Effect schema (Type literal).
   */
  schema: Schema.Schema<T, any>;

  /**
   * Initial values (which may not pass validation).
   */
  values: Partial<T>;

  /**
   * Whether the form can be saved (i.e., data is valid).
   */
  canSave: boolean;

  /**
   * Called when the form is submitted and passes validation.
   */
  onSave?: (values: T, meta: { changed: FormHandler<T>['changed'] }) => void;

  /**
   * Called when the form is canceled to abandon/undo any pending changes.
   */
  onCancel?: () => void;
};

const [NewFormContextProvider, useNewFormContext] = createContext<NewFormContextValue>('NewForm');

//
// Root
//

type NewFormRootProps<T extends AnyProperties = AnyProperties> = PropsWithChildren<
  {} & MakeOptional<Pick<NewFormContextValue<T>, 'debug' | 'schema' | 'values' | 'onSave' | 'onCancel'>, 'values'>
>;

const NewFormRoot = <T extends AnyProperties = AnyProperties>({
  children,
  debug,
  schema,
  values: valuesProp,
  onSave,
  onCancel,
}: NewFormRootProps<T>) => {
  const [values, setValues] = useState(valuesProp ?? {});
  const [canSave, setCanSave] = useState(false);

  return (
    <NewFormContextProvider
      debug={debug}
      schema={schema}
      values={values}
      canSave={canSave}
      onSave={onSave}
      onCancel={onCancel}
    >
      {children}
    </NewFormContextProvider>
  );
};

NewFormRoot.displayName = 'NewForm.Root';

//
// Content
//

type NewFormContentProps = ThemedClassName<{}>;

const NewFormContent = ({ classNames }: NewFormContentProps) => {
  const context = useNewFormContext(NewFormContent.displayName);
  return <div className={mx(classNames)}>{JSON.stringify(context)}</div>;
};

NewFormContent.displayName = 'NewForm.Content';

//
// Actions
//

type NewFormActionsProps = ThemedClassName<{}>;

const NewFormActions = ({ classNames }: NewFormActionsProps) => {
  const { t } = useTranslation(translationKey);
  const { values, canSave, onSave, onCancel } = useNewFormContext(NewFormActions.displayName);

  return (
    <div role='none' className={mx('grid grid-cols gap-1', classNames)}>
      {onCancel && (
        <IconButton
          data-testid='cancel-button'
          icon='ph--x--regular'
          label={t('cancel button label')}
          onClick={onCancel}
        />
      )}
      {onSave && (
        <IconButton
          type='submit'
          data-testid='save-button'
          disabled={!canSave}
          icon='ph--check--regular'
          label={t('save button label')}
          onClick={() => onSave(values, { changed: {} })}
        />
      )}
    </div>
  );
};

NewFormActions.displayName = 'NewForm.Actions';

//
// NewForm
// https://www.radix-ui.com/primitives/docs/guides/composition
//

export const NewForm = {
  Root: NewFormRoot,
  Content: NewFormContent,
  Actions: NewFormActions,
};

export { useNewFormContext };

export type { NewFormRootProps, NewFormContentProps, NewFormActionsProps };
