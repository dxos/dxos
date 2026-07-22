//
// Copyright 2025 DXOS.org
//

import { Prec } from '@codemirror/state';
import React, { type Ref, useCallback, useMemo, useRef, useState } from 'react';

import { type Database, Obj } from '@dxos/echo';
import {
  Button,
  Column,
  Icon,
  IconButton,
  Input,
  ScrollArea,
  composable,
  composableProps,
  useTranslation,
} from '@dxos/react-ui';
import { type EditorController } from '@dxos/react-ui-editor';
import { EMAIL_REGEX, RefEditor } from '@dxos/react-ui-form';
import { type Message as MessageType, Person } from '@dxos/types';
import { type Extension, keymap } from '@dxos/ui-editor';

import { meta } from '#meta';

import { Editor } from '../Editor';

type MessageField = 'to' | 'cc' | 'bcc' | 'subject';

/**
 * `ArrowUp`/`ArrowDown` move focus to the previous/next visible field (the recipient editors are
 * single-line, so the arrows are otherwise no-ops). `Prec.highest` so it wins over CodeMirror's
 * default cursor movement.
 */
const fieldNavExtension = (field: MessageField, navigate: (from: MessageField, direction: -1 | 1) => void): Extension =>
  Prec.highest(
    keymap.of([
      {
        key: 'ArrowUp',
        run: () => {
          navigate(field, -1);
          return true;
        },
      },
      {
        key: 'ArrowDown',
        run: () => {
          navigate(field, 1);
          return true;
        },
      },
    ]),
  );

/** Full name for the recipient typeahead (falls back to the object id). */
const getPersonLabel = (object: Obj.Unknown): string =>
  (Obj.instanceOf(Person.Person, object) ? object.fullName : undefined) ?? object.id;

/** A person's email addresses — the values captured by the `'email'`-mode picker. */
const getPersonValues = (object: Obj.Unknown): readonly string[] =>
  Obj.instanceOf(Person.Person, object) ? (object.emails ?? []).map(({ value }) => value) : [];

/**
 * A recipient field: a single-line CodeMirror editor ({@link RefEditor} in `'email'` mode) that
 * autocompletes against the space's `Person` records and captures an RFC 5322 mailbox list. Shared by
 * the To / Cc / Bcc rows.
 */
const RecipientEditor = ({
  editorRef,
  extensions,
  db,
  value,
  placeholder,
  onChange,
}: {
  editorRef?: Ref<EditorController>;
  extensions?: Extension[];
  db?: Database.Database;
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) => (
  <RefEditor
    ref={editorRef}
    extensions={extensions}
    db={db}
    type={Person.Person}
    mode='email'
    match={EMAIL_REGEX}
    icon='ph--user--regular'
    getLabel={getPersonLabel}
    getValues={getPersonValues}
    activateOnTyping
    classNames='flex flex-1 min-w-0 h-[2rem] items-center'
    placeholder={placeholder}
    value={value}
    onChange={onChange}
  />
);

export type EditMessageProps = {
  message: MessageType.Message;
  extensions?: Extension[];
  /** Optional header title (e.g. "Draft"); shown with the delete affordance when provided. */
  title?: string;
  onSend?: (message: MessageType.Message) => Promise<void>;
  /** When set, renders a delete button in the header that discards the message. */
  onDelete?: () => void;
};

export const EditMessage = composable<HTMLDivElement, EditMessageProps>(
  ({ message, extensions, onSend, title, onDelete, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.profile.key);
    const db = Obj.getDatabase(message);
    const [showCc, setShowCc] = useState(!!message.properties?.cc);
    const [showBcc, setShowBcc] = useState(!!message.properties?.bcc);

    // Field focus + arrow navigation. Show flags are mirrored into refs so the stable `navigate`
    // reads the current visible set.
    const toRef = useRef<EditorController>(null);
    const ccRef = useRef<EditorController>(null);
    const bccRef = useRef<EditorController>(null);
    const subjectRef = useRef<HTMLInputElement>(null);
    const showCcRef = useRef(showCc);
    showCcRef.current = showCc;
    const showBccRef = useRef(showBcc);
    showBccRef.current = showBcc;

    // A just-revealed recipient field's CodeMirror view is created in a passive effect that runs
    // *after* the next animation frame, so focusing eagerly no-ops; retry across frames until the
    // controller's view exists (already-mounted fields focus on the first pass).
    const focusField = useCallback((field: MessageField, attempts = 6) => {
      if (field === 'subject') {
        subjectRef.current?.focus();
        return;
      }
      const controller = field === 'to' ? toRef.current : field === 'cc' ? ccRef.current : bccRef.current;
      if (controller?.view) {
        controller.view.focus();
      } else if (attempts > 0) {
        requestAnimationFrame(() => focusField(field, attempts - 1));
      }
    }, []);

    const navigate = useCallback(
      (from: MessageField, direction: -1 | 1) => {
        const order: MessageField[] = [
          'to',
          ...(showCcRef.current ? (['cc'] as const) : []),
          ...(showBccRef.current ? (['bcc'] as const) : []),
          'subject',
        ];
        const next = order[order.indexOf(from) + direction];
        if (next) {
          focusField(next);
        }
      },
      [focusField],
    );

    const toNav = useMemo(() => [fieldNavExtension('to', navigate)], [navigate]);
    const ccNav = useMemo(() => [fieldNavExtension('cc', navigate)], [navigate]);
    const bccNav = useMemo(() => [fieldNavExtension('bcc', navigate)], [navigate]);

    // Reveal Cc/Bcc and move focus into it; `focusField` retries until its view has mounted.
    const revealCc = useCallback(() => {
      setShowCc(true);
      focusField('cc');
    }, [focusField]);
    const revealBcc = useCallback(() => {
      setShowBcc(true);
      focusField('bcc');
    }, [focusField]);

    const updateField = useCallback(
      (field: MessageField, value: string) => {
        Obj.update(message, (message) => {
          (message.properties ??= {})[field] = value;
        });
      },
      [message],
    );

    const handleBodyChanged = useCallback(
      (value: string) => {
        Obj.update(message, (message) => {
          const blocks = (message.blocks ??= []);
          const textBlock = blocks.find((block) => block._tag === 'text');
          if (textBlock && 'text' in textBlock) {
            textBlock.text = value;
          } else {
            blocks.push({ _tag: 'text', text: value });
          }
        });
      },
      [message],
    );

    // Send success/failure is surfaced via toasts by the caller's `onSend` (see `useSendEmail`).
    const handleSend = useCallback(() => {
      void onSend?.(message);
    }, [onSend, message]);

    const showHeader = title != null || !!onDelete;

    const labelStyles = 'shrink-0 ps-2 pe-2 text-description text-sm';

    return (
    <ScrollArea.Root className='dx-container'>
      <ScrollArea.Viewport>
        <Column.Root
          {...composableProps(props, {
            // The editor row uses `minmax(8lh,1fr)` (not `1fr`) so its minimum height participates in
            // layout: when the surface is short the whole form scrolls (outer ScrollArea) instead of
            // the editor overflowing its cell and overlapping the Send button.
            classNames: showHeader
              ? 'grid-rows-[min-content_min-content_minmax(8lh,1fr)_min-content]'
              : 'grid-rows-[min-content_minmax(8lh,1fr)_min-content]',
          })}
          gutter='sm'
          ref={forwardedRef}
        >
          {showHeader && (
            <Column.Center classNames='flex items-center justify-between pbs-form-gap'>
              <h2 className='text-lg'>{title}</h2>
              {onDelete && (
                <IconButton
                  iconOnly
                  variant='ghost'
                  icon='ph--trash--regular'
                  label={t('delete-draft-button.label')}
                  onClick={onDelete}
                />
              )}
            </Column.Center>
          )}

          <Column.Center classNames='flex flex-col' data-testid='edit-email-form'>
            <div className='flex items-center'>
              <span className={labelStyles}>{t('draft-to.label')}</span>
              <RecipientEditor
                editorRef={toRef}
                extensions={toNav}
                db={db}
                value={message.properties?.to}
                placeholder={t('draft-to.placeholder')}
                onChange={(value) => updateField('to', value)}
              />

              {(!showCc || !showBcc) && (
                <span className='shrink-0 flex items-center gap-2 pe-2 text-sm text-description'>
                  {!showCc && (
                    <button type='button' className='dx-link-hover' onClick={revealCc}>
                      {t('draft-cc.label')}
                    </button>
                  )}
                  {!showBcc && (
                    <button type='button' className='dx-link-hover' onClick={revealBcc}>
                      {t('draft-bcc.label')}
                    </button>
                  )}
                </span>
              )}
            </div>

            {showCc && (
              <div className='flex items-center'>
                <div className={labelStyles}>{t('draft-cc.label')}</div>
                <RecipientEditor
                  editorRef={ccRef}
                  extensions={ccNav}
                  db={db}
                  value={message.properties?.cc}
                  onChange={(value) => updateField('cc', value)}
                />
              </div>
            )}

            {showBcc && (
              <div className='flex items-center'>
                <span className={labelStyles}>{t('draft-bcc.label')}</span>
                <RecipientEditor
                  editorRef={bccRef}
                  extensions={bccNav}
                  db={db}
                  value={message.properties?.bcc}
                  onChange={(value) => updateField('bcc', value)}
                />
              </div>
            )}

            <Input.Root>
              <Input.Label srOnly>{t('draft-subject.label')}</Input.Label>
              <Input.TextInput
                ref={subjectRef}
                variant='subdued'
                placeholder={t('draft-subject.placeholder')}
                defaultValue={message.properties?.subject}
                onChange={(event) => updateField('subject', event.target.value)}
                onKeyDown={(event) => {
                  // Arrow-up returns to the previous recipient field (arrow-down stays in the input).
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    navigate('subject', -1);
                  }
                }}
              />
            </Input.Root>
          </Column.Center>

          <Column.Center classNames='flex flex-col py-3 min-h-0'>
            <Editor
              compact
              classNames='dx-input dx-expander'
              placeholder={t('message-body.placeholder')}
              extensions={extensions}
              value={message.blocks?.find((block) => block._tag === 'text')?.text ?? ''}
              onChange={handleBodyChanged}
            />
          </Column.Center>

          <Column.Center classNames='pb-form-padding'>
            <Button variant='primary' onClick={handleSend} data-testid='send-email-button'>
              <Icon icon='ph--paper-plane-right--regular' size={5} />
              <span className='ms-2'>{t('send-email-button.label')}</span>
            </Button>
          </Column.Center>
        </Column.Root>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
  },
);
