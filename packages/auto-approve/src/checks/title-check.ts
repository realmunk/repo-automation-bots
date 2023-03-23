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

export class TitleCheck implements CheckRule {
  readonly regex: RegExp;
  readonly inverse: boolean;
  constructor(regex: RegExp, inverse = false) {
    this.regex = regex;
    this.inverse = inverse;
  }

  async checkPR(pullRequest: PullRequest): Promise<CheckResult[]> {
    let matches = this.regex.test(pullRequest.title);
    if (this.inverse) {
      matches = !matches;
    }
    return [
      {
        name: 'titleMatches',
        status: matches,
      },
    ];
  }
}
