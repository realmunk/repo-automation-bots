// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {CloudBuildClient} from '@google-cloud/cloudbuild';
import {Repository} from './repository';

export interface BootstrapRequest {
  apiId: string;
  language: string;
  languageContainer: string;
  destinationRepository: Repository;
  installationId: number;
  sourceCl: number;
  serviceConfigPath: string;
}

export interface BootstrapMetadata {
  logsUrl: string;
  bootstrapUrl: string;
}

export interface BootstrapperOptions {
  projectId: string;
  triggerId?: string;
  commonContainer?: string;
}

interface BootstrapOptions {
  skipIssueOnFailure?: boolean;
}

const DEFAULT_TRIGGER_ID = 'owlbot-bootstrapper-trigger';
const DEFAULT_COMMON_CONTAINER =
  'us-docker.pkg.dev/owlbot-bootstrap-prod/owlbot-bootstrapper-images/owlbot-bootstrapper:latest';

export class Bootstrapper {
  private projectId: string;
  private triggerId: string;
  private commonContainer: string;
  private workspaceDir: string;

  constructor(options: BootstrapperOptions) {
    this.projectId = options.projectId;
    this.triggerId = options.triggerId ?? DEFAULT_TRIGGER_ID;
    this.commonContainer = options.commonContainer ?? DEFAULT_COMMON_CONTAINER;
    this.workspaceDir = '/workspace';
  }

  async bootstrapLibrary(
    request: BootstrapRequest,
    options: BootstrapOptions
  ): Promise<BootstrapMetadata> {
    const cb = new CloudBuildClient({
      projectId: this.projectId,
      fallback: 'rest',
    });
    const [resp] = await cb.runBuildTrigger({
      projectId: this.projectId,
      triggerId: this.triggerId,
      source: {
        projectId: this.projectId,
        branchName: 'main',
        substitutions: {
          _API_ID: request.apiId,
          _REPO_TO_CLONE: request.destinationRepository.gitUri,
          _LANGUAGE: request.language,
          _INSTALLATION_ID: String(request.installationId),
          _CONTAINER: this.commonContainer,
          _LANGUAGE_CONTAINER: request.languageContainer,
          _PROJECT_ID: this.projectId,
          _MONO_REPO_DIR: this.workspaceDir,
          _MONO_REPO_ORG: request.destinationRepository.owner,
          _MONO_REPO_NAME: request.destinationRepository.repo,
          _MONO_REPO_PATH: `${this.workspaceDir}/${request.destinationRepository.repo}`,
          _SERVICE_CONFIG_PATH: request.serviceConfigPath,
          _SOURCE_CL: String(request.sourceCl),
          _INTER_CONTAINER_VARS_PATH: `${this.workspaceDir}/interContainerVars.json`,
          _SKIP_ISSUE_ON_FAILURE: String(options.skipIssueOnFailure),
        },
      },
    });

    await resp.promise();

    const logsUrl = (resp.metadata as any).build.logUrl;

    return {
      logsUrl,
      bootstrapUrl: 'FIXME',
    };
  }
}
