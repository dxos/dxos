import React from 'react';
import clsx from 'clsx';
import * as styles from './HomepageFeatures.module.css';

const FeatureList = [
  {
    title: 'Preserving privacy',
    Svg: require('../../static/img/home/icon-halo.svg').default,
    description: (
      <>
        The HALO protocol manages digital identity, collaboration, and access to applications, databases, and network devices. The HALO keychain works across devices and is seamlessly integrated into all DXOS applications.
      </>
    ),
  },
  {
    title: 'Unlocking your data',
    Svg: require('../../static/img/home/icon-echo.svg').default,
    description: (
      <>
        The ECHO protocol enables secure and scalable realtime databases that are used by applications and network services. ECHO incorporates unique data replication and consensus technologies that power realtime collaboration applications.
      </>
    ),
  },
  {
    title: 'Resilient P2P networks',
    Svg: require('../../static/img/home/icon-mesh.svg').default,
    description: (
      <>
        The MESH protocol extends existing internet protocols to enable secure and resilient peer-to-peer networks. MESH enables the development of privacy-preserving applications that operate without centralized infrastructure.
      </>
    ),
  },
];

interface FeatureProps {
  title: string
  description: JSX.Element
  Svg: any
}

function Feature({Svg, title, description}: FeatureProps) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
