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

export class AllowedFilesCheck implements CheckRule {
  readonly regexes: RegExp[];
  constructor(...regexes: RegExp[]) {
    this.regexes = regexes;
  }

  async checkPR(pullRequest: PullRequest): Promise<CheckResult[]> {
    for (const file of pullRequest.changedFiles) {
      const match = this.regexes.find(regex => regex.test(file.filename));
      if (!match) {
        return [
          {
            name: 'allowedFileMatches',
            status: false,
          },
        ];
      }
    }
    return [
      {
        name: 'allowedFileMatches',
        status: true,
      },
    ];
  }
}
