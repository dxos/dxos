//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useRef } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { IconButton, type IconButtonProps, ScrollArea, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import {
  type FormHandler,
  type FormHandlerProps,
  type FormUpdateMeta,
  useFormHandler,
  useKeyHandler,
} from '../../hooks';
import { translationKey } from '../../translations';

import { FormFieldSet, type FormFieldSetProps } from './FormFieldSet';
import { FormContext } from './FormRoot';

// [x] TextArea
// [x] Use NewForm with FeedbackForm
// [x] Use NewForm with ViewEditor
// [ ] NewForm.stories.tsx
//  [x] Fix onSave callback (loses focus on change)
//  [x] Fix autosave
//  [x] Keyboard handler (autosave)
//  [ ] Don't call save/autoSave if value hasn't changed
//  [ ] Fix onCancel (restore values)
// [x] Static mode
//   [x] Ref
//   [x] Boolean
//   [x] Array
//   [x] Object
//   [x] Geo
// [ ] Split inline from layout.
// [ ] Omit id from sub properties.
// [ ] Update hooks used by external packages (i.e., useFormValues)
// [ ] Refs
//   [x] Single-select (fix popover)
//   [ ] Multi-select (array)
//   [ ] Defer query until popover

// [ ] Test 22 usages (opencode migration)
// [ ] Merge stage 1

// Misc
// [ ] Remove 'outerSpacing' prop
// [ ] Remove client dependency from react-ui-table
// [ ] Fix useSchema Type.Obj.Any cast
// [ ] TableCellEditor (handleEnter/ModalController).
// [ ] Remove @dxos/echo-db deps

// New features/polish
// [x] Unify readonly/inline modes
// [ ] Use FormFieldWrapper uniformly
// [ ] Inline tables for object arrays

// TODO(burdon): Option to omit automatically?
export const omitId = <S extends Schema.Schema.AnyNoContext>(schema: S) => schema.pipe(Schema.omit('id'));

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
} & Pick<FormFieldSetProps<T>, 'readonly' | 'layout' | 'fieldMap' | 'fieldProvider'>;

const [NewFormContextProvider, useNewFormContext] = createContext<NewFormContextValue>('NewForm');

//
// Root
//

type NewFormRootProps<T extends AnyProperties = AnyProperties> = PropsWithChildren<
  {
    /**
     * Called when the form is submitted and passes validation.
     */
    onSave?: (values: T, meta: FormUpdateMeta<T>) => void;

    /**
     * Called when the form is canceled to abandon/undo any pending changes.
     */
    onCancel?: () => void;
  } &
    // prettier-ignore
    Omit<NewFormContextValue<T>, 'form'> &
    Pick<FormHandlerProps<T>, 'schema' | 'autoSave' | 'values' | 'onAutoSave' | 'onValidate' | 'onValuesChanged'> &
    Omit<FormFieldSetProps<T>, 'schema' | 'path'>
>;

const NewFormRoot = <T extends AnyProperties = AnyProperties>({
  children,
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
      <NewFormContextProvider form={form} {...props}>
        {children}
      </NewFormContextProvider>
    </FormContext.Provider>
  );
};

NewFormRoot.displayName = 'NewForm.Root';

//
// Viewport
//

type NewFormViewportProps = ThemedClassName<PropsWithChildren<{}>>;

const NewFormViewport = ({ classNames, children }: NewFormViewportProps) => {
  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport classNames={['plb-cardSpacingBlock', classNames]}>{children}</ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='vertical'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
};

NewFormViewport.displayName = 'NewForm.Viewport';

//
// Content
//

type NewFormContentProps = ThemedClassName<PropsWithChildren<{}>>;

const NewFormContent = ({ classNames, children }: NewFormContentProps) => {
  const { form } = useNewFormContext(NewFormContent.displayName);
  const ref = useRef<HTMLDivElement>(null);
  useKeyHandler(ref.current, form);

  return (
    <div role='none' className={mx('flex flex-col is-full pli-cardSpacingInline', classNames)} ref={ref}>
      {children}
    </div>
  );
};

NewFormContent.displayName = 'NewForm.Content';

//
// FieldSet
//

type NewFormFieldSetProps = ThemedClassName<{}>;

const NewFormFieldSet = ({ classNames }: NewFormFieldSetProps) => {
  const { form, ...props } = useNewFormContext(NewFormFieldSet.displayName);

  return <FormFieldSet classNames={classNames} schema={form.schema} {...props} />;
};

NewFormFieldSet.displayName = 'NewForm.FieldSet';

//
// Actions
//

type NewFormActionsProps = ThemedClassName<{}>;

const NewFormActions = ({ classNames }: NewFormActionsProps) => {
  const { t } = useTranslation(translationKey);
  const {
    form: { isValid, onSave, onCancel },
    readonly,
    layout,
  } = useNewFormContext(NewFormActions.displayName);

  if (readonly || layout === 'static') {
    return null;
  }

  return (
    <div role='none' className={mx('grid grid-flow-col auto-cols-fr gap-2 pbs-cardSpacingBlock', classNames)}>
      {onCancel && (
        <IconButton
          icon='ph--x--regular'
          iconEnd
          label={t('cancel button label')}
          onClick={onCancel}
          data-testid='cancel-button'
        />
      )}
      {onSave && (
        <IconButton
          type='submit'
          variant='primary'
          disabled={!isValid}
          icon='ph--check--regular'
          iconEnd
          label={t('save button label')}
          onClick={onSave}
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
  const {
    form: { isValid, onSave },
    readonly,
    layout,
  } = useNewFormContext(NewFormSubmit.displayName);

  if (readonly || layout === 'static') {
    return null;
  }

  return (
    <div role='none' className={mx('flex is-full pbs-cardSpacingBlock', classNames)}>
      <IconButton
        classNames='is-full'
        type='submit'
        variant='primary'
        disabled={!isValid}
        icon={icon ?? 'ph--check--regular'}
        label={label ?? t('save button label')}
        onClick={onSave}
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
  Viewport: NewFormViewport,
  Content: NewFormContent,
  FieldSet: NewFormFieldSet,
  Actions: NewFormActions,
  Submit: NewFormSubmit,
};

export { useNewFormContext };

export type { NewFormRootProps, NewFormViewportProps, NewFormContentProps, NewFormFieldSetProps, NewFormActionsProps };
