//
// Copyright 2023 DXOS.org
//

import { CaretLeft, Check } from '@phosphor-icons/react';
import React, { cloneElement } from 'react';

import { AuthenticatingInvitationObservable } from '@dxos/client';
import { InvitationResult, useInvitationStatus } from '@dxos/react-client';
import { Button, getSize, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateProps } from './ViewState';

export interface InvitationAcceptedProps extends ViewStateProps {
  Domain: 'Space' | 'Halo';
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: (result: InvitationResult | null) => void;
}

const PureInvitationAcceptedContent = ({
  onDone,
  result,
  Domain,
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
      data-autofocus={`success${Domain}Invitation`}
      data-testid={`${Domain.toLowerCase()}-invitation-accepted-done`}
    >
      <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
      <span className='grow'>{t('done label')}</span>
      <Check weight='bold' className={getSize(4)} />
    </Button>
  );

  return doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton;
};

const InvitationAcceptedContent = (
  props: InvitationAcceptedProps & { activeInvitation: AuthenticatingInvitationObservable }
) => {
  const { result } = useInvitationStatus(props.activeInvitation);
  return <PureInvitationAcceptedContent {...props} result={result} />;
};

export const InvitationAccepted = (props: InvitationAcceptedProps) => {
  const { Domain, doneActionParent: _doneActionParent, onDone: _onDone, ...viewStateProps } = props;
  const activeInvitation =
    viewStateProps.joinState?.context[Domain.toLowerCase() as 'halo' | 'space'].invitationObservable;

  return (
    <ViewState {...viewStateProps}>
      {!activeInvitation ? (
        <PureInvitationAcceptedContent {...props} result={null} />
      ) : (
        <InvitationAcceptedContent {...props} activeInvitation={activeInvitation} />
      )}
    </ViewState>
  );
};
