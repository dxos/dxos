# ECHO DB

Eventually Consistent Hierarchical Objects Database.

The ECHO database uses feed replication to synchronize data across peers in a network.
Each feed consists of an ordered collection of immutable messages.
These messages represent mutations on the ECHO data model.
ECHO implements an eventually consistent data model across peers.


## Usage

```bash
yarn
yarn test
```


# Configuration

NOTE: `eslintConfig` config in the root `package.json` is required for IDE lint parsing.
