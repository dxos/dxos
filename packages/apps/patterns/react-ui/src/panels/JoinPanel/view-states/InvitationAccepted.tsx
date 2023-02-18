//
// Copyright 2023 DXOS.org
//

import { CaretLeft, Check } from 'phosphor-react';
import React, { cloneElement } from 'react';

import { AuthenticatingInvitationObservable } from '@dxos/client';
import { InvitationResult, useInvitationStatus } from '@dxos/react-client';
import { Button, getSize, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateProps } from './ViewState';

export interface InvitationAcceptedProps extends ViewStateProps {
  invitationType: 'space' | 'halo';
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: (result: InvitationResult | null) => void;
}

const PureInvitationAcceptedContent = ({
  onDone,
  result,
  invitationType,
  doneActionParent,
  active
}: InvitationAcceptedProps & { result: InvitationResult | null }) => {
  const disabled = !active;
  const { t } = useTranslation('os');

  const doneButton = (
    <Button
      {...(onDone && { onClick: () => onDone(result) })}
      disabled={disabled}
      className='grow flex items-center gap-2 pli-2'
      data-autofocus={`${invitationType} invitation acceptor; invitation accepted`}
    >
      <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
      <span className='grow'>{t('done label')}</span>
      <Check weight='bold' className={getSize(4)} />
    </Button>
  );

  return doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton;
};

const InvitationAcceptedContent = (props: InvitationAcceptedProps) => {
  const { result } = useInvitationStatus(props.activeInvitation as AuthenticatingInvitationObservable);
  return <PureInvitationAcceptedContent {...props} result={result} />;
};

export const InvitationAccepted = (props: InvitationAcceptedProps) => {
  const {
    invitationType: _invitationType,
    doneActionParent: _doneActionParent,
    onDone: _onDone,
    ...viewStateProps
  } = props;
  const { activeInvitation } = viewStateProps;

  return (
    <ViewState {...viewStateProps}>
      {!activeInvitation || activeInvitation === true ? (
        <PureInvitationAcceptedContent {...props} result={null} />
      ) : (
        <InvitationAcceptedContent {...props} />
      )}
    </ViewState>
  );
};
