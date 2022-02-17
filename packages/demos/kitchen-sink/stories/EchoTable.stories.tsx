//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/css';

import { Party } from '@dxos/client';
import { ClientProvider, ProfileInitializer, useClient, useSelection } from '@dxos/react-client';

import { EchoTable, OrgBuilder, ProjectBuilder, TestType, usePartyBuilder } from '../src';

export default {
  title: 'KitchenSink/EchoTable'
};

// TODO(burdon): Devtools mesh.
// TODO(burdon): createItem defaults.
// TODO(burdon): useSelection ?? [] (create default).
// TODO(burdon): dxos:item/party (replace or change slash).

const styles = css`
  height: 100vh;
  overflow: scroll;
`;

// TODO(burdon): Factor out.

const useTestParty = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const builder = usePartyBuilder(party);

  useEffect(() => {
    setImmediate(async () => {
      const party = await client.echo.createParty();
      setParty(party);
    });
  }, []);

  useEffect(() => {
    if (builder) {
      setImmediate(async () => {
        await builder.createOrgs([2, 3], async (orgBuilder: OrgBuilder) => {
          await orgBuilder.createPeople([2, 5]);
          await orgBuilder.createProjects([2, 4], async (projectBuilder: ProjectBuilder) => {
            const { result: people } = await orgBuilder.org
              .select()
              .children()
              .filter({ type: TestType.Person })
              .query();

            await projectBuilder.createTasks([2, 5], people);
          });
        });
      }, []);
    }
  }, [builder]);

  return party;
}

const App = () => {
  const party = useTestParty();
  const items = useSelection(party?.select()) ?? [];

  return (
    <div className={styles}>
      <EchoTable
        items={items}
      />
    </div>
  );
};

export const Primary = () => {
  return (
    <ClientProvider config={{}}>
      <ProfileInitializer>
        <App />
      </ProfileInitializer>
    </ClientProvider>
  );
};
