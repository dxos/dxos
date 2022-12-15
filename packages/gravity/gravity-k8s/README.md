# GRAVITY

## INTRODUCTION
DXOS uses __gravity__ framework to perform at scale, performance, stress, end to end testing of dxos and its components with a variety of test case flavours. 

__Gravity__ has a number of configuration files that determine its behaviour. For example, in the config directory you will find config.yml file which tells gravity how to communicate with __kube__. spec-test-X.yml files contain various test scenarious that are executed by the framework's agent component. DXOS __agent__ uses DXOS SDK to communicate with varous functional layers.

## SOFTWARE
If you decide to set up and run __Gravity__ locally, you will have to install the following software components that __Gravity__ depends on:
  * [Docker Desktop](https://docs.docker.com/desktop/install/mac-install/)
  * [K8S Minikube](https://minikube.sigs.k8s.io/docs/start/)

We strongly suggest to follow the chip specific instructions when installing and configuring your Docker Desktop, otherwise, the behaviour of your Docker Desktop together with minikube will become unstable, and, yes you will have to reboot your system to resume work. That's awefully inconvenient, and that's why we suggest you follow the instructions to the letter.

### Gravity
__Gravity__ is located in a few directories, mainly:
  * gravity/gravity-agent - contains the logic to process the test scenarios defined in the gravity-k8s folder
  * gravity/gravity-k8s - contains "everything" _docker_ and _k8s_ related

@TODO: provide short description for each file and its designation

__Gravity__ will comes prefonfigured wtih all meaningful permutations of the test and deployment cases. It will be up to you which test you want to run. 

### Environment
Before you can run the tests, you need to initialize your environment. The following commands will make sure you don't run into any issues related to a misconfigured run environment.

Make sure the docker daemon is running [what this means if you are on Mac OS X - simply launch your Docker Desktop]

Start __minikube__:

```bash
minikube start
eval $(minikube docker-env)
```

__Dev note__: for some bizarre reason, the default storage provisioner k8s.io/minikube-hostpath in _minikube_ does not work.
A solution that we found was to replace it with the docker storage provisioner. Btw, why do we need this? To be able to store test results on a node. So, here is the fix:

```bash
kubectl delete storageclass standard
kubectl apply -f storageclass.yml
```

We have prepared a storage class yaml file that defines a docker storage provider: storageclass.yml

### Docker Image
Before we can our tests, we need to build docker container images that we want to deploy to __k8s__ to execute.
As of this writing we have two kinds of docker images that we use:
  * KUBE
  * Agent

To build _kube_, make sure you are in _gravity/gravity-k8s_ directory and execute the following command:
```bash
docker build -t dxos-kube -f docker-kube .
```

To build _agent_, same rules as above apply, and, you need to provide a personal access token (PAT) for DXOS git repo, as we are building the agent from the dxos source code.

[How to set up Git PAT](https://docs.github.com/en/enterprise-server@3.4/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

When you have generated your PAT, run the following command and provide your Git PAT at GIT_TOKEN location:
```bash
docker build --build-arg NODE_VER=$(cat .node-version) --build-arg GIT_TOKEN=<sample ghp_X> -t dxos-agent -f docker-agent .
```

When both docker container images are built, you need to set up persistent volume:
```bash
kubectl apply -f pvc.yml
```
and finally:
```bash
kubectl apply -f gravity.pv.yml
```

### Test Results
You can check the log results with a couple of methods.
```bash
kubectl logs gravity -c dxos-kube
...
kubectl logs gravity -c dxos-agent-host
...
kubectl logs gravity -c dxos-agent-guest
```

In your Docker Desktop you can open the _minikube_'s container terminal and check for the log files in _/mnt/data_
