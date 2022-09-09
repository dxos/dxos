//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import React from 'react';

import * as styles from './HomepageFeatures.module.css';

const FeatureList = [
  {
    title: 'Preserving privacy',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Svg: require('../../static/img/home/icon-halo.svg').default,
    description: (
      <>
        The HALO protocol manages digital identity, collaboration, and access to applications, databases, and network devices. The HALO keychain works across devices and is seamlessly integrated into all DXOS applications.
      </>
    )
  },
  {
    title: 'Unlocking your data',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Svg: require('../../static/img/home/icon-echo.svg').default,
    description: (
      <>
        The ECHO protocol enables secure and scalable realtime databases that are used by applications and network services. ECHO incorporates unique data replication and consensus technologies that power realtime collaboration applications.
      </>
    )
  },
  {
    title: 'Resilient P2P networks',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Svg: require('../../static/img/home/icon-mesh.svg').default,
    description: (
      <>
        The MESH protocol extends existing internet protocols to enable secure and resilient peer-to-peer networks. MESH enables the development of privacy-preserving applications that operate without centralized infrastructure.
      </>
    )
  }
];

interface FeatureProps {
  title: string
  description: JSX.Element
  Svg: any
}

const Feature = ({ Svg, title, description }: FeatureProps) => (
  <div className={clsx('col col--4')}>
    <div className='text--center'>
      <Svg className={styles.featureSvg} alt={title} />
    </div>
    <div className='text--center padding-horiz--md'>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  </div>
);

export const HomepageFeatures = () => (
  <section className={styles.features}>
    <div className='container'>
      <div className='row'>
        {FeatureList.map((props, idx) => (
          <Feature key={idx} {...props} />
        ))}
      </div>
    </div>
  </section>
);
