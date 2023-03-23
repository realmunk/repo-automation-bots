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

export class AuthorCheck implements CheckRule {
  readonly allowedAuthors: string[];
  constructor(...allowedAuthors: string[]) {
    this.allowedAuthors = allowedAuthors;
  }

  async checkPR(pullRequest: PullRequest): Promise<CheckResult[]> {
    const foundAuthor = this.allowedAuthors.find(
      author => author === pullRequest.author
    );
    return [
      {
        name: 'authorshipMatches',
        status: !!foundAuthor,
      },
    ];
  }
}
