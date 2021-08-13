//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { makeStyles } from '@material-ui/core/styles';

import AutocompleteFilter from '../components/AutocompleteFilter';
import Feed from '../components/Feed';
import { useBridge } from '../hooks/bridge';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden'
  },

  filter: {
    display: 'flex',
    flexShrink: 0,
    padding: theme.spacing(1),
    paddingTop: theme.spacing(2)
  },

  feed: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden'
  }
}));

const FeedViewer = () => {
  const [bridge] = useBridge();
  const [topics, setTopics] = useState();
  const [topic, setTopic] = useState();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    bridge.send('topics').then(topics => setTopics(topics));

    bridge.listen('feed.data', ({ data }) => {
      setMessages(data);
    });

    let feedListenerKey;

    if (topic) {
      (async () => {
        feedListenerKey = await bridge.send('feed.subscribe', { topic });
      })();
    }

    return () => {
      if (feedListenerKey) {
        bridge.send('feed.unsubscribe', { key: feedListenerKey });
      }
    };
  }, [bridge, topic]);

  const onTopicChange = (value) => {
    setTopic(value);
  };

  const classes = useStyles();

  return (
    <div className={classes.root}>
      <div className={classes.filter}>
        <AutocompleteFilter label='Topic' options={topics} onChange={onTopicChange} value={topic} />
      </div>

      <div className={classes.feed}>
        <Feed messages={messages} />
      </div>
    </div>
  );
};

export default FeedViewer;
