// Copyright 2021 Google LLC
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

import {PullRequest, CheckResult} from '../interfaces';
import {getOpenPRsInRepoFromSameAuthor} from '../utils-for-pr-checking';
import {listCommitsOnAPR} from '../get-pr-info';
import {Octokit} from '@octokit/rest';
import {BaseLanguageRule} from './base';
import {TitleCheck} from '../checks/title-check';
import {AuthorCheck} from '../checks/author-check';
import {BodyCheck} from '../checks/body-check';
import {LibraryTypeCheck} from '../checks/library-type-check';

const ALLOWED_AUTHOR = 'gcf-owl-bot[bot]';

export class OwlBotAPIChanges extends BaseLanguageRule {
  constructor(octokit: Octokit) {
    super(octokit);
    this.rules.concat(new TitleCheck(/(breaking|BREAKING|!)/, true));
    this.rules.concat(new AuthorCheck(ALLOWED_AUTHOR));
    this.rules.concat(new BodyCheck(/PiperOrigin-RevId/));
    this.rules.concat(new LibraryTypeCheck(octokit, 'GAPIC_AUTO'));
  }

  public async additionalChecks(
    incomingPR: PullRequest
  ): Promise<CheckResult[]> {
    const checkResults: CheckResult[] = [];

    const openOwlBotPRs = await getOpenPRsInRepoFromSameAuthor(
      incomingPR.repoOwner,
      incomingPR.repoName,
      incomingPR.author,
      this.octokit
    );
    checkResults.concat({
      name: 'areThereOtherOwlBotPRs',
      status: openOwlBotPRs === 0,
    });

    const commitsOnPR = await listCommitsOnAPR(
      incomingPR.repoOwner,
      incomingPR.repoName,
      incomingPR.prNumber,
      this.octokit
    );
    const otherCommitAuthors = commitsOnPR.filter(
      x => x.author?.login !== ALLOWED_AUTHOR
    );
    checkResults.concat({
      name: 'areThereOtherCommitAuthors',
      status: otherCommitAuthors.length === 0,
    });
    return checkResults;
  }
}
