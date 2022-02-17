//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/css';

import { Party } from '@dxos/client';
import { truncateString } from '@dxos/debug';
import { ClientProvider, ProfileInitializer, useClient, useSelection } from '@dxos/react-client';

import { OrgBuilder, ProjectBuilder, TestType, useGenerator } from '../src';

export default {
  title: 'demos/selection'
};

// TODO(burdon): Devtools mesh.
// TODO(burdon): createItem defaults.
// TODO(burdon): useSelection ?? [] (create default).
// TODO(burdon): dxos:item/party (replace or change slash).

const styles = css`
  height: 100vh;
  overflow: scroll;

  table {
    td {
      font-family: monospace;
      font-size: 16px;
      padding: 2px 8px;
      color: #333;
    }
    
    // https://mui.com/customization/color/#color-palette
    td.example_type_org {
      color: #00796b;
    }
    td.example_type_project {
      color: #7b1fa2;
    }
    td.example_type_person {
      color: #e64a19;
    }
    td.example_type_task {
      color: #388e3c;
    }
  }
`;

const App = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const generator = useGenerator(party);
  const items = useSelection(party?.select()) ?? [];
  console.log(items);

  useEffect(() => {
    setImmediate(async () => {
      const party = await client.echo.createParty();
      setParty(party);
    });
  }, []);

  useEffect(() => {
    if (generator) {
      setImmediate(async () => {
        await generator.createOrgs([2, 3], async (orgBuilder: OrgBuilder) => {
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
  }, [generator]);

  return (
    <div className={styles}>
      <table>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                {truncateString(item.id, 8)}
              </td>
              <td className={item.type!.replace(/\W/g, '_')}>
                {item.type}
              </td>
              <td>
                {item.model.getProperty('title')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
