//
// Copyright 2026 DXOS.org
//

import React, { type FocusEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';

import { meta } from '#meta';
import { type Feature } from '#types';

import { RequirementIcon, RequirementId, RowIcon } from './fields.tsx';

type CommitFieldProps = {
  value: string;
  label: string;
  testId: string;
  autoFocus?: boolean;
  onCommit: (value: string) => void;
};

/**
 * A wrapping field committed when it loses focus (Enter does that; Shift+Enter breaks the line). Uncontrolled, so a
 * newer value from another peer replaces the text only while the reader has not changed it.
 */
const CommitField = ({ value, label, testId, autoFocus, onCommit }: CommitFieldProps) => {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const shownRef = useRef(value);
  useEffect(() => {
    const field = fieldRef.current;
    if (field && field.value === shownRef.current) {
      field.value = value;
    }
    shownRef.current = value;
  }, [value]);
  useEffect(() => {
    if (autoFocus) {
      fieldRef.current?.focus();
    }
  }, [autoFocus]);

  const handleBlur = (event: FocusEvent<HTMLTextAreaElement>) => {
    const next = event.currentTarget.value.trim();
    if (next !== value) {
      onCommit(next);
    }
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // An IME's Enter confirms a composition candidate, not the field.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };
  return (
    // Sized by its content, so a one-line requirement takes one line.
    <Input.Textarea
      ref={fieldRef}
      defaultValue={value}
      aria-label={label}
      data-testid={testId}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      classNames='-ms-1 my-1 px-1 py-0 w-[calc(100%+0.25rem)] min-h-0 [field-sizing:content] resize-none'
    />
  );
};

export type RequirementEditorProps = {
  requirements: readonly Feature.Requirement[];
  onChange: (requirements: Feature.Requirement[]) => void;
};

/**
 * A feature's requirements, each a field that wraps to its whole text, with the spec id it came from before it and a
 * remove action after. Every edit hands back the whole list, since requirements are records inside their feature; a
 * requirement cleared of its text is removed.
 */
export const RequirementEditor = ({ requirements, onChange }: RequirementEditorProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  // The row just added takes focus, so a new requirement is written before anything else.
  const [focusIndex, setFocusIndex] = useState<number>();
  const copy = () => requirements.map((requirement) => ({ ...requirement }));
  const remove = (index: number) => copy().filter((_, candidate) => candidate !== index);
  return (
    <Card.Root grid border={false} data-testid='requirement-editor'>
      {requirements.map((requirement, index) => (
        <Card.Row
          key={index}
          // The column's content clips overflow (for truncation), which would cut off the field's box.
          classNames='[&_.dx-card-row-content]:overflow-visible'
          leading={<RequirementIcon />}
          trailing={
            <Card.Action
              icon='ph--x--regular'
              label={t('requirement-editor.remove.label')}
              data-testid={`requirement-editor.${index}.remove`}
              onClick={() => onChange(remove(index))}
            />
          }
        >
          {/* The spec id leads the text, as it does in the read-only list; the field takes the rest of the row. */}
          <Layout.Flex gap='sm' classNames='items-baseline min-w-0'>
            {requirement.id && <RequirementId id={requirement.id} />}
            <div className='grow min-w-0'>
              <CommitField
                value={requirement.text}
                label={t('requirement-editor.text.label')}
                testId={`requirement-editor.${index}.text`}
                autoFocus={index === focusIndex}
                onCommit={(text) =>
                  onChange(
                    text
                      ? copy().map((candidate, candidateIndex) =>
                          candidateIndex === index ? { ...candidate, text } : candidate,
                        )
                      : remove(index),
                  )
                }
              />
            </div>
          </Layout.Flex>
        </Card.Row>
      ))}
      <Card.Row
        leading={<RowIcon icon='ph--plus--regular' />}
        data-testid='requirement-editor.add'
        onClick={() => {
          setFocusIndex(requirements.length);
          onChange([...copy(), { text: '' }]);
        }}
      >
        <Card.Text variant='muted'>{t('requirement-editor.add.label')}</Card.Text>
      </Card.Row>
    </Card.Root>
  );
};
