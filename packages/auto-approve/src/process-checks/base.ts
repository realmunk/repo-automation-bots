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

import {Octokit} from '@octokit/rest';
import { LanguageRule, CheckRule, PullRequest, CheckResult } from "../interfaces";
import { GCFLogger, logger as defaultLogger } from 'gcf-utils';

export class BaseLanguageRule implements LanguageRule {
  octokit: Octokit;
  logger: GCFLogger;
  protected rules: CheckRule[] =[]

  constructor(
    octokit: Octokit,
    logger: GCFLogger = defaultLogger
  ) {
    this.octokit = octokit;
    this.logger = logger;
  }

  async checkPR(pullRequest: PullRequest): Promise<boolean> {
    const {repoOwner, repoName, prNumber} = pullRequest;
    const checkResults: CheckResult[] = [];
    for (const rule of this.rules) {
      checkResults.concat(...(await rule.checkPR(pullRequest)));
    }
    checkResults.concat(...(await this.additionalChecks(pullRequest)));

    // must pass at least one check
    if (checkResults.length === 0) {
      return false;
    }

    let valid = true;
    for (const checkResult of checkResults) {
      this.logger.info(`${checkResult.status}: ${checkResult.name}`);
      valid && checkResult.status;
    }
    return valid;
  }

  async additionalChecks(pullRequest: PullRequest): Promise<CheckResult[]> {
    return [];
  }
}