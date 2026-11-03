//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Format } from '@dxos/echo';
import { log } from '@dxos/log';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';

import { type FormFieldRendererProps } from '#types';

import { FormStaticValue } from '../FormField.tsx';
import { presentationFor } from '../presentation.tsx';

export const TextField = ({
  type,
  format,
  readonly,
  label,
  placeholder,
  presentation,
  action,
  autoFocus,
  jsonPath,
  getValue,
  onBlur,
  onValueChange,
  onRevert,
}: FormFieldRendererProps<string>) => {
  const value = getValue() ?? '';
  const { isStatic, showLabel } = presentationFor(presentation);
  if (isStatic) {
    return <FormStaticValue value={value} format={format} />;
  }

  // An opaque identifier is not prose: no spellcheck squiggles, no autocorrect, no capitalisation.
  const key = format === Format.TypeFormat.Key;
  const handleAction = () =>
    action
      ?.run(value || undefined)
      .then((next) => {
        if (next !== undefined) {
          onValueChange(type, next);
          onBlur();
        }
      })
      .catch((error) => log.warn('field action failed', { error }));
  return (
    <Input.Root
      noAutoFill
      autoFocus={autoFocus}
      disabled={!!readonly}
      placeholder={placeholder}
      // A row that draws no label names its control itself.
      aria-label={showLabel ? undefined : label || undefined}
      value={value}
      onBlur={onBlur}
      onChange={(event) => onValueChange(type, event.target.value)}
      // Enter commits the field as leaving it does, so an auto-saving form saves without the user tabbing away.
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
          onBlur();
        }
        // Escape drops the uncommitted edit, so the field shows the saved value and its blur saves nothing.
        if (event.key === 'Escape') {
          onRevert();
        }
      }}
      data-testid={jsonPath}
      end={
        action && (
          <Button.Root
            variant='ghost'
            compact
            icon={action.icon}
            iconOnly
            label={action.label}
            disabled={!!readonly}
            data-testid={`${jsonPath}.action`}
            onClick={handleAction}
          />
        )
      }
      {...((presentation === 'title' || presentation === 'plain') && { variant: presentation })}
      {...(key && { variant: 'mono', spellCheck: false, autoCorrect: 'off', autoCapitalize: 'none' })}
    />
  );
};
