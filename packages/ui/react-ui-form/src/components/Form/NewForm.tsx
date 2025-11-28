//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { IconButton, type IconButtonProps, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type FormHandler, type FormHandlerProps, useFormHandler } from '../../hooks';
import { translationKey } from '../../translations';

import { FormFieldSet, type FormFieldSetProps } from './FormFieldSet';
import { FormContext } from './FormRoot';

// [ ] TextArea
// [x] Replace FeedbackForm.
// [ ] Unify readonly/inline modes.
// [ ] Inline tables for object arrays
// [ ] Refs, Selectors
// [ ] Keyboard handler
// [ ] Additional root props: options, callbacks
// [ ] Reaplce context, hooks.
// [ ] Unify fieldMap/fieldProvider map callback (with adapter for map).
// [ ] Status message must include field (currently just "is missing")

//
// Context
//

type NewFormContextValue<T extends AnyProperties = any> = {
  /**
   * Form handler.
   */
  form: FormHandler<T>;

  /**
   * Show debug info.
   */
  debug?: boolean;
} & Pick<FormFieldSetProps<T>, 'readonly'>;

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
  } & (Pick<FormHandlerProps<T>, 'schema' | 'values'> & Pick<NewFormContextValue<T>, 'debug' | 'readonly'>)
>;

const NewFormRoot = <T extends AnyProperties = AnyProperties>({
  children,
  debug,
  schema,
  values,
  onSave,
  onCancel,
  ...props
}: NewFormRootProps<T>) => {
  const form = useFormHandler({ schema, values, onSave, onCancel, ...props });

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
// TODO(burdon): Viewport with scroller.
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
          icon='ph--x--regular'
          iconEnd
          label={t('cancel button label')}
          onClick={form.onCancel}
          data-testid='cancel-button'
        />
      )}
      {form.onSave && (
        <IconButton
          type='submit'
          variant='primary'
          disabled={!form.canSave}
          icon='ph--check--regular'
          iconEnd
          label={t('save button label')}
          onClick={form.onSave}
          data-testid='save-button'
        />
      )}
    </div>
  );
};

NewFormActions.displayName = 'NewForm.Actions';

//
// Submit
//

type NewFormSubmitProps = ThemedClassName<Partial<Pick<IconButtonProps, 'icon' | 'label'>>>;

const NewFormSubmit = ({ classNames, label, icon }: NewFormSubmitProps) => {
  const { t } = useTranslation(translationKey);
  const { form } = useNewFormContext(NewFormSubmit.displayName);

  return (
    <div role='none' className={mx('flex is-full pbs-cardSpacingBlock', classNames)}>
      <IconButton
        classNames='is-full'
        type='submit'
        variant='primary'
        disabled={!form.canSave}
        icon={icon ?? 'ph--check--regular'}
        label={label ?? t('save button label')}
        onClick={form.onSave}
        data-testid='save-button'
      />
    </div>
  );
};

NewFormSubmit.displayName = 'NewForm.Submit';

//
// NewForm
// https://www.radix-ui.com/primitives/docs/guides/composition
//

export const NewForm = {
  Root: NewFormRoot,
  Content: NewFormContent,
  FieldSet: NewFormFieldSet,
  Actions: NewFormActions,
  Submit: NewFormSubmit,
};

export { useNewFormContext };

export type { NewFormRootProps, NewFormContentProps, NewFormFieldSetProps, NewFormActionsProps };
