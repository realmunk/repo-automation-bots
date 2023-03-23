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

import {FileRule, PullRequest, CheckResult} from '../../interfaces';
import {
  doesDependencyChangeMatchPRTitleV2,
  getVersionsV2,
  runVersioningValidation,
  isOneDependencyChanged,
} from '../../utils-for-pr-checking';
import {Octokit} from '@octokit/rest';
import {BaseLanguageRule} from '../base';
import {AuthorCheck} from '../../checks/author-check';
import {MaxFilesCheck} from '../../checks/max-files-check';
import {TitleCheck} from '../../checks/title-check';
import {AllowedFilesCheck} from '../../checks/allowed-files-check';

export class NodeDependency extends BaseLanguageRule {
  fileRules: FileRule[] = [
    {
      dependencyTitle:
        /^(fix|chore)\(deps\): update dependency (@?\S*) to v(\S*)$/,
      targetFileToCheck: /^samples\/package.json$/,
      // This would match: -  "version": "^2.3.0" or -  "version": "~2.3.0"
      oldVersion: /-[\s]*"(@?\S*)":[\s]"(?:\^?|~?)([0-9])*\.([0-9]*\.[0-9]*)",/,
      // This would match: +  "version": "^2.3.0" or +  "version": "~2.3.0"
      newVersion: /\+[\s]*"(@?\S*)":[\s]"(?:\^?|~?)([0-9])*\.([0-9]*\.[0-9]*)"/,
    },
    {
      dependencyTitle:
        /^(fix|chore)\(deps\): update dependency (@?\S*) to v(\S*)$/,
      targetFileToCheck: /^package.json$/,
      // This would match: -  "version": "^2.3.0" or -  "version": "~2.3.0"
      oldVersion: /-[\s]*"(@?\S*)":[\s]"(?:\^?|~?)([0-9])*\.([0-9]*\.[0-9]*)",/,
      // This would match: +  "version": "^2.3.0" or +  "version": "~2.3.0"
      newVersion: /\+[\s]*"(@?\S*)":[\s]"(?:\^?|~?)([0-9])*\.([0-9]*\.[0-9]*)"/,
    },
  ];

  constructor(octokit: Octokit) {
    super(octokit);
    this.rules.concat(
      new TitleCheck(
        /^(fix|chore)\(deps\): update dependency (@?\S*) to v(\S*)$/
      )
    );
    this.rules.concat(new AuthorCheck('renovate-bot'));
    this.rules.concat(new MaxFilesCheck(3));
    this.rules.concat(new AllowedFilesCheck(/package\.json$/));
  }

  public async additionalChecks(
    incomingPR: PullRequest
  ): Promise<CheckResult[]> {
    const checkResults: CheckResult[] = [];
    for (const file of incomingPR.changedFiles) {
      const fileMatch = this.fileRules.find((x: FileRule) =>
        x.targetFileToCheck.test(file.filename)
      );

      if (!fileMatch) {
        continue;
      }

      const versions = getVersionsV2(
        file,
        fileMatch.oldVersion,
        fileMatch.newVersion
      );

      if (!versions) {
        continue;
      }

      checkResults.concat({
        name: 'doesDependencyMatch',
        status: doesDependencyChangeMatchPRTitleV2(
          versions,
          // We can assert this exists since we're in the class rule that contains it
          fileMatch.dependencyTitle!,
          incomingPR.title
        ),
        scope: file.filename,
      });

      checkResults.concat({
        name: 'isVersionValid',
        status: runVersioningValidation(versions),
        scope: file.filename,
      });

      checkResults.concat({
        name: 'oneDependencyChanged',
        status: isOneDependencyChanged(file),
        scope: file.filename,
      });
    }
    return checkResults;
  }
}
