//
// Copyright 2024 DXOS.org
//

import { micromark } from 'micromark';
import { directive, directiveHtml } from 'micromark-extension-directive';
import React from 'react';

import { Button, Dialog } from '@dxos/react-ui';

// @ts-ignore
import NOTICE from './notice.md?raw';

// TODO(burdon): Reconcile with react-theme.
const linkStyle = 'text-sky-700 dark:text-sky-200 hover:opacity-80';

function link(this: any, d: any) {
  if (d.type !== 'textDirective') {
    return false;
  }

  this.tag('<a');
  if (d.attributes && 'href' in d.attributes) {
    this.tag(` class="${linkStyle}" target="_blank" rel="noreferrer" href="${this.encode(d.attributes.href)}"`);
  }
  this.tag('>');
  this.raw(d.label || '');
  this.tag('</a>');
}

export const BetaDialog = () => {
  // TODO(burdon): Magic link Auto enable existing users without signing up?
  const SIGNUP_URL = 'https://dxos.org/composer#beta';
  const handleSignup = () => {
    window.open(SIGNUP_URL, '_blank');
  };

  const html = micromark(NOTICE, { extensions: [directive()], htmlExtensions: [directiveHtml({ link })] });

  return (
    <Dialog.Content classNames='md:max-is-[30rem]'>
      <Dialog.Title>Composer is moving!</Dialog.Title>
      <div role='none' className='plb-2 space-y-3' dangerouslySetInnerHTML={{ __html: html }} />
      <div role='none' className='flex justify-end gap-2'>
        <Dialog.Close asChild>
          <Button>Dismiss</Button>
        </Dialog.Close>
        <Button variant='primary' onClick={handleSignup}>
          Sign up
        </Button>
      </div>
    </Dialog.Content>
  );
};
