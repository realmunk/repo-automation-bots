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

import {
  File,
  PullRequest,
  FileRule,
  CheckResult,
} from '../../interfaces';
import {
  getVersionsV2,
  runVersioningValidation,
  isOneDependencyChanged,
  mergesOnWeekday,
} from '../../utils-for-pr-checking';
import {Octokit} from '@octokit/rest';
import {BaseLanguageRule} from '../base';
import {TitleCheck} from '../../checks/title-check';
import {AuthorCheck} from '../../checks/author-check';
import {MaxFilesCheck} from '../../checks/max-files-check';
import {AllowedFilesCheck} from '../../checks/allowed-files-check';

export class NodeRelease extends BaseLanguageRule {
  fileRules: FileRule[] = [
    {
      targetFileToCheck: /^package.json$/,
      // This would match: -  "version": "2.3.0"
      oldVersion: new RegExp(
        /-[\s]*"(@?\S*)":[\s]"([0-9]*)*\.([0-9]*\.[0-9]*)",/
      ),
      // This would match: +  "version": "2.3.0"
      newVersion: new RegExp(
        /\+[\s]*"(@?\S*)":[\s]"([0-9]*)*\.([0-9]*\.[0-9]*)",/
      ),
    },
  ];
  constructor(octokit: Octokit) {
    super(octokit);
    this.rules.concat(new TitleCheck(/^chore: release/));
    this.rules.concat(new AuthorCheck('release-please'));
    this.rules.concat(new MaxFilesCheck(2));
    this.rules.concat(
      new AllowedFilesCheck(/^package.json$/, /^CHANGELOG.md$/)
    );
  }

  public async additionalChecks(
    pullRequest: PullRequest
  ): Promise<CheckResult[]> {
    const checkResults: CheckResult[] = [];
    checkResults.concat({
      name: 'isMergedOnWeekDay',
      status: mergesOnWeekday(),
    });

    for (const fileRule of this.fileRules) {
      const fileMatch = pullRequest.changedFiles?.find((x: File) =>
        fileRule.targetFileToCheck.test(x.filename)
      );

      if (!fileMatch) {
        continue;
      }

      const versions = getVersionsV2(
        fileMatch,
        fileRule.oldVersion,
        fileRule.newVersion
      );

      if (!versions) {
        continue;
      }

      checkResults.concat({
        name: 'isVersionValid',
        status: runVersioningValidation(versions),
        scope: fileMatch.filename,
      });

      checkResults.concat({
        name: 'oneDependencyChanged',
        status: isOneDependencyChanged(fileMatch),
        scope: fileMatch.filename,
      });
    }
    return checkResults;
  }
}
