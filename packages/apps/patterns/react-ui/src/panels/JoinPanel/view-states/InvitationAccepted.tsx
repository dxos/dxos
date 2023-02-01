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
  ...viewStateProps
}: InvitationAcceptedProps & { result: InvitationResult | null }) => {
  const disabled = !viewStateProps.active;
  const { t } = useTranslation('os');

  return (
    <Button
      {...(onDone && { onClick: () => onDone(result) })}
      disabled={disabled}
      className='grow flex items-center gap-2 pli-2'
      data-autofocus='space invitation acceptor; invitation accepted'
    >
      <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
      <span className='grow'>{t('done label')}</span>
      <Check weight='bold' className={getSize(4)} />
    </Button>
  );
};

const InvitationAcceptedContent = (props: InvitationAcceptedProps) => {
  const { result } = useInvitationStatus(props.activeInvitation as AuthenticatingInvitationObservable);
  return <PureInvitationAcceptedContent {...props} result={result} />;
};

export const InvitationAccepted = (props: InvitationAcceptedProps) => {
  const { invitationType: _invitationType, doneActionParent, onDone: _onDone, ...viewStateProps } = props;
  const { activeInvitation } = viewStateProps;

  const doneButton =
    !activeInvitation || activeInvitation === true ? (
      <PureInvitationAcceptedContent {...props} result={null} />
    ) : (
      <InvitationAcceptedContent {...props} />
    );

  return (
    <ViewState {...viewStateProps}>
      {doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton}
    </ViewState>
  );
};
