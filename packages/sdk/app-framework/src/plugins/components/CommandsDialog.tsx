//
// Copyright 2023 DXOS.org
//

import React, { useMemo, useRef } from 'react';

import { type Action, type Graph, type Label } from '@dxos/app-graph';
import { Keyboard } from '@dxos/keyboard';
import { Button, Dialog, useTranslation } from '@dxos/react-ui';

export const CommandsDialogContent = ({ graph }: { graph?: Graph }) => {
  const { t } = useTranslation('os');

  // TODO(burdon): Factor out.
  // TODO(burdon): How to access all translations across plugins?
  const getLabel = (label: Label) => (Array.isArray(label) ? t(...label) : label);

  // Traverse graph.
  const actions = useMemo(() => {
    // TODO(burdon): Get from navtree (not keybaord).
    const current = Keyboard.singleton.getCurrentContext();
    const actions: Action[] = [];
    graph?.traverse({
      visitor: (node, path) => {
        if (current.startsWith(path.join('/'))) {
          node.actions.forEach((action) => {
            actions.push(action);
          });
        }
      },
    });

    // console.log(JSON.stringify(actions, undefined, 2));
    return actions;
  }, [graph]);

  // TODO(burdon): Remove.
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Content classNames={['h-[50%] md:max-is-[30rem] overflow-hidden']}>
      <Dialog.Title>{t('commands dialog title', { ns: 'os' })}</Dialog.Title>

      <div className='flex flex-col grow overflow-y-auto my-2'>
        {/* TODO(burdon): Action id isn't unique. */}
        {actions.map((action, i) => (
          <div
            key={i}
            onClick={() => {
              // TODO(burdon): Close dialog (via hook?)
              buttonRef.current?.click();
              setTimeout(() => {
                void action.invoke();
              });
            }}
          >
            {getLabel(action.label)}
          </div>
        ))}
      </div>

      <Dialog.Close asChild>
        <Button ref={buttonRef} variant='primary' classNames='mbs-2'>
          {t('close label', { ns: 'os' })}
        </Button>
      </Dialog.Close>
    </Dialog.Content>
  );
};
