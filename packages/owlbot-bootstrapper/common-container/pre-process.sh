#!/bin/bash

# set git configuration
git config --global user.name "Owlbot Bootstrapper"
git config --global user.email "owlbot-bootstrapper[bot]@users.noreply.github.com"
git config --global credential.helper 'store --file ${directoryPath}/.git-credentials'

# clone target repo
git clone https://x-access-token:${githubToken}@github.com/${repoOrg}/${repoName}

# write to inter-container-vars

# fake service config YAML if necessary
