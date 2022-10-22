//
// Copyright 2022 DXOS.org
//

import React from 'react';

// import { useNavigate, useSearchParams } from 'react-router-dom';
// import { useClient } from '@dxos/react-client';
import { Button, Heading, Main, useTranslation } from '@dxos/react-uikit';

export const InviteDevicePage = () => {
  const { t } = useTranslation();
  // const client = useClient();
  // const [username, setUsername] = useState('');
  // const [pending, setPending] = useState(false);
  // const navigate = useNavigate();
  // const [searchParams] = useSearchParams();
  // const redirect = searchParams.get('redirect') ?? '/spaces';
  // const onNext = useCallback(() => {
  //   setPending(true);
  //   void client.halo.createProfile({ username }).then(
  //     () => navigate(redirect),
  //     (_rejection) => setPending(false)
  //   );
  // }, [username]);
  return (
    <Main className='max-w-lg mx-auto'>
      <Heading>{t('invite device label', { ns: 'uikit' })}</Heading>
      <p>To do.</p>
      <Button onClick={() => history.back()}>
        {t('back label', { ns: 'uikit' })}
      </Button>
    </Main>
  );
};
