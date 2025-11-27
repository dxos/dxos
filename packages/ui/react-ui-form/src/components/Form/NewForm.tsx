//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type MakeOptional } from '@dxos/util';

import { type FormHandler, useFormHandler } from '../../hooks';
import { translationKey } from '../../translations';

import { FormFieldSet, type FormFieldSetProps } from './FormFieldSet';
import { FormContext } from './FormRoot';

//
// Context
//

type NewFormContextValue<T extends AnyProperties = any> = {
  /**
   * Show debug info.
   */
  debug?: boolean;

  /**
   * Form handler.
   */
  form: FormHandler<T>;
} & Pick<FormFieldSetProps, 'readonly'>;

const [NewFormContextProvider, useNewFormContext] = createContext<NewFormContextValue>('NewForm');

//
// Root
//

type NewFormRootProps<T extends AnyProperties = AnyProperties> = PropsWithChildren<
  {
    /**
     * Called when the form is submitted and passes validation.
     */
    onSave?: (values: T, meta: { changed: FormHandler<T>['changed'] }) => void;

    /**
     * Called when the form is canceled to abandon/undo any pending changes.
     */
    onCancel?: () => void;
  } & (MakeOptional<FormHandler<T>, 'values'> &
    MakeOptional<Pick<NewFormContextValue<T>, 'debug' | 'readonly'>, 'readonly'>)
>;

const NewFormRoot = <T extends AnyProperties = AnyProperties>({
  children,
  debug,
  schema,
  values: valuesProp = {},
  onSave,
  onCancel,
  ...props
}: NewFormRootProps<T>) => {
  const form = useFormHandler({ schema, initialValues: valuesProp, onSave, onCancel, ...props });

  return (
    // TODO(burdon): Temporarily include old context.
    <FormContext.Provider value={form}>
      <NewFormContextProvider form={form} debug={debug} {...props}>
        {children}
      </NewFormContextProvider>
    </FormContext.Provider>
  );
};

NewFormRoot.displayName = 'NewForm.Root';

//
// Content
//

type NewFormContentProps = ThemedClassName<PropsWithChildren<{}>>;

const NewFormContent = ({ classNames, children }: NewFormContentProps) => {
  return <div className={mx('flex flex-col is-full pli-cardSpacingInline', classNames)}>{children}</div>;
};

NewFormContent.displayName = 'NewForm.Content';

//
// FieldSet
//

type NewFormFieldSetProps = ThemedClassName<{}>;

const NewFormFieldSet = ({ classNames }: NewFormFieldSetProps) => {
  const { form, readonly } = useNewFormContext(NewFormFieldSet.displayName);

  return <FormFieldSet classNames={classNames} schema={form.schema} readonly={readonly} />;
};

NewFormFieldSet.displayName = 'NewForm.FieldSet';

//
// Actions
//

type NewFormActionsProps = ThemedClassName<{}>;

const NewFormActions = ({ classNames }: NewFormActionsProps) => {
  const { t } = useTranslation(translationKey);
  const { form, readonly } = useNewFormContext(NewFormActions.displayName);

  if (readonly) {
    return null;
  }

  return (
    <div role='none' className={mx('grid grid-flow-col auto-cols-fr gap-2 pbs-cardSpacingBlock', classNames)}>
      {form.onCancel && (
        <IconButton
          data-testid='cancel-button'
          icon='ph--x--regular'
          iconEnd
          label={t('cancel button label')}
          onClick={form.onCancel}
        />
      )}
      {form.onSave && (
        <IconButton
          type='submit'
          data-testid='save-button'
          disabled={!form.canSave}
          icon='ph--check--regular'
          iconEnd
          label={t('save button label')}
          onClick={form.onSave}
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
  FieldSet: NewFormFieldSet,
  Actions: NewFormActions,
};

export { useNewFormContext };

export type { NewFormRootProps, NewFormContentProps, NewFormFieldSetProps, NewFormActionsProps };
