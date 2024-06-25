#!/bin/bash

# set config
git config --global user.name "Owlbot Bootstrapper"
git config --global user.email "owlbot-bootstrapper[bot]@users.noreply.github.com"
git config --global credential.helper 'store --file ${directoryPath}/.git-credentials'

