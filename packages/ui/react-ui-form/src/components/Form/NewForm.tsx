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
} & Pick<FormFieldSetProps, 'readonly'>;

const [NewFormContextProvider, useNewFormContext] = createContext<NewFormContextValue>('NewForm');

//
// Root
//

type NewFormRootProps<T extends AnyProperties = AnyProperties> = PropsWithChildren<
  {} & MakeOptional<
    Pick<NewFormContextValue<T>, 'debug' | 'schema' | 'values' | 'readonly' | 'onSave' | 'onCancel'>,
    'values' | 'readonly'
  >
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
  const [values, setValues] = useState(valuesProp ?? {});
  const [canSave, setCanSave] = useState(false);

  // TODO(burdon): Temporarily include old context.
  const form = useFormHandler({ schema, initialValues: values, onSave, ...props });

  return (
    <FormContext.Provider value={form}>
      <NewFormContextProvider
        debug={debug}
        schema={schema}
        values={values}
        canSave={canSave}
        onSave={onSave}
        onCancel={onCancel}
        {...props}
      >
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
  const { schema, readonly } = useNewFormContext(NewFormFieldSet.displayName);

  return <FormFieldSet classNames={classNames} schema={schema} readonly={readonly} />;
};

NewFormFieldSet.displayName = 'NewForm.FieldSet';

//
// Actions
//

type NewFormActionsProps = ThemedClassName<{}>;

const NewFormActions = ({ classNames }: NewFormActionsProps) => {
  const { t } = useTranslation(translationKey);
  const { readonly, values, canSave, onSave, onCancel } = useNewFormContext(NewFormActions.displayName);

  if (readonly) {
    return null;
  }

  return (
    <div role='none' className={mx('grid grid-cols gap-1 pbs-cardSpacingBlock', classNames)}>
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
  FieldSet: NewFormFieldSet,
  Actions: NewFormActions,
};

export { useNewFormContext };

export type { NewFormRootProps, NewFormContentProps, NewFormFieldSetProps, NewFormActionsProps };
