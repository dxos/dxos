//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import type * as Schema from 'effect/Schema';
import React, { type PropsWithChildren } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type MaybePromise } from '@dxos/util';

import { type FormHandler } from '../../hooks';

//
// Context
//

type NewFormContextValue = {};

const [NewFormContextProvider, useNewFormContext] = createContext<NewFormContextValue>('NewForm');

//
// Root
//

type NewFormRootProps<T extends AnyProperties = AnyProperties> = PropsWithChildren<{
  /**
   * Effect schema (Type literal).
   */
  schema: Schema.Schema<T, any>;

  /**
   * Initial values (which may not pass validation).
   */
  values?: Partial<T>;

  /**
   * Called when the form is submitted and passes validation.
   */
  onSave?: (values: T, meta: { changed: FormHandler<T>['changed'] }) => MaybePromise<void>;
}>;

const NewFormRoot = <T extends AnyProperties>({ children, onSave }: NewFormRootProps<T>) => {
  return <NewFormContextProvider>{children}</NewFormContextProvider>;
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
// NewForm
// https://www.radix-ui.com/primitives/docs/guides/composition
//

export const NewForm = {
  Root: NewFormRoot,
  Content: NewFormContent,
};

export { useNewFormContext };

export type { NewFormRootProps, NewFormContentProps };
