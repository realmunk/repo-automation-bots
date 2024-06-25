#!/bin/bash
set -ex

COMMON_IMAGE=gcr.io/chingor-test/ob-common
LANGUAGE_IMAGE=gcr.io/chingor-test/node-bootstrapper

pushd common-container
gcloud builds submit . -t "${COMMON_IMAGE}"
popd

# pushd /Users/chingor/code/google-cloud-node/
# gcloud builds submit . --config=containers/node-bootstrap-container/cloudbuild.yaml
# popd

gcloud builds triggers run owlbot-bootstrapper \
  --substitutions=_LANGUAGE_CONTAINER=${LANGUAGE_IMAGE}:latest,_CONTAINER=${COMMON_IMAGE}:latest,_REPO_TO_CLONE=https://github.com/googleapis/google-cloud-node,_MONO_REPO_DIR=/workspace/monorepo,_SOURCE_CL=1234,_SERVICE_CONFIG_PATH=google/cloud/redis/cluster/v1beta1/redis_v1beta1.yaml,_INTER_CONTAINER_VARS_PATH=/workspace/interContainerVars.json,_API_ID=redis.googleapis.com,_MONO_REPO_PATH=/workspace/monorepo