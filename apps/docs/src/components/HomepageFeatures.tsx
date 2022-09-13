//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import React, { ComponentType, SVGProps } from 'react';

import EchoIcon from '../../static/img/home/icon-echo.svg';
import HaloIcon from '../../static/img/home/icon-halo.svg';
import MeshIcon from '../../static/img/home/icon-mesh.svg';
import styles from './HomepageFeatures.module.css';

type FeatureItem = {
  title: string
  image: ComponentType<SVGProps<SVGSVGElement>>
  description: JSX.Element
};

console.log({ HaloIcon });

const FeatureList = [
  {
    title: 'Preserving privacy',
    image: HaloIcon,
    description: (
      <>
        The HALO protocol manages digital identity, collaboration, and access to applications, databases, and network devices. The HALO keychain works across devices and is seamlessly integrated into all DXOS applications.
      </>
    )
  },
  {
    title: 'Unlocking your data',
    image: EchoIcon,
    description: (
      <>
        The ECHO protocol enables secure and scalable realtime databases that are used by applications and network services. ECHO incorporates unique data replication and consensus technologies that power realtime collaboration applications.
      </>
    )
  },
  {
    title: 'Resilient P2P networks',
    image: MeshIcon,
    description: (
      <>
        The MESH protocol extends existing internet protocols to enable secure and resilient peer-to-peer networks. MESH enables the development of privacy-preserving applications that operate without centralized infrastructure.
      </>
    )
  }
];

const Feature = ({ title, image: Image, description }: FeatureItem) => (
  <div className={clsx('col col--4')}>
    <div className='text--center'>
      {/* TODO(wittjosiah): Something wrong with React types here, using v18 for some reason. */}
      {/* eslint-disable-next-line */}
      {/* @ts-ignore */}
      <Image className={styles.featureSvg} />
    </div>
    <div className='text--center padding-horiz--md'>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  </div>
);

export default (): JSX.Element => (
  <section className={styles.features}>
    <div className='container'>
      <div className='row'>
        {FeatureList.map((props, idx) => (
          // TODO(wittjosiah): Something wrong with React types here, using v18 for some reason.
          // eslint-disable-next-line
          // @ts-ignore
          <Feature key={idx} {...props} />
        ))}
      </div>
    </div>
  </section>
);
