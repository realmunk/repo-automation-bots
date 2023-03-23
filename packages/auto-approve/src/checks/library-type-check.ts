// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {CheckRule, PullRequest, CheckResult} from '../interfaces';
import { Octokit } from '@octokit/rest';
import { getFileContent } from '../get-pr-info';

export class LibraryTypeCheck implements CheckRule {
  private octokit: Octokit;
  readonly allowedLibraryTypes: string[];
  constructor(octokit: Octokit, ...allowedLibraryTypes: string[]) {
    this.octokit = octokit;
    this.allowedLibraryTypes = allowedLibraryTypes;
  }

  async checkPR(pullRequest: PullRequest): Promise<CheckResult[]> {

    const fileContent = await getFileContent(
      pullRequest.repoOwner,
      pullRequest.repoName,
      '.repo-metadata.json',
      this.octokit
    );
    const libraryType = JSON.parse(fileContent).library_type;
    const foundLibraryType = this.allowedLibraryTypes.find(
      type => type === libraryType
    );
    return [
      {
        name: 'libraryTypeCheck',
        status: !!foundLibraryType,
      },
    ];
  }
}
