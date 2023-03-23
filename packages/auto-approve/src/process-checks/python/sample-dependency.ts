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
import {BaseLanguageRule} from '../base';
import {TitleCheck} from '../../checks/title-check';
import {AuthorCheck} from '../../checks/author-check';
import {AllowedFilesCheck} from '../../checks/allowed-files-check';
import {PullRequest, CheckResult, FileRule} from '../../interfaces';
import {
  getVersionsV2,
  doesDependencyChangeMatchPRTitleV2,
  runVersioningValidation,
  isOneDependencyChanged,
  doesDependencyMatchAgainstRegexes,
} from '../../utils-for-pr-checking';

interface PythonFileRule extends FileRule {
  // @Python team: please add API paths here to exclude from auto-approving
  targetFileToExclude: RegExp[];
  regexForDepToInclude: RegExp[];
}

export class PythonSampleDependency extends BaseLanguageRule {
  fileRules: PythonFileRule[] = [
    {
      targetFileToCheck: /requirements.txt$/,
      // @Python team: please add API paths here to exclude from auto-approving
      targetFileToExclude: [/airflow/, /composer/],
      // This would match: fix(deps): update dependency @octokit to v1
      dependencyTitle: new RegExp(
        /^(fix|chore)\(deps\): update dependency (@?\S*) to v(\S*)$/
      ),
      // This would match: '-google-cloud-storage==1.39.0
      oldVersion: new RegExp(/[\s]-(@?[^=0-9]*)==([0-9])*\.([0-9]*\.[0-9]*)/),
      // This would match: '+google-cloud-storage==1.40.0
      newVersion: new RegExp(/[\s]\+(@?[^=0-9]*)==([0-9])*\.([0-9]*\.[0-9]*)/),
      regexForDepToInclude: [/google/],
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
    this.rules.concat(new AllowedFilesCheck(/requirements.txt$/));
  }

  async additionalChecks(pullRequest: PullRequest): Promise<CheckResult[]> {
    const checkResults: CheckResult[] = [];

    for (const file of pullRequest.changedFiles) {
      // Each file must conform to at least one file rule, or else we could
      // be allowing a random file to be approved
      const fileMatch = this.fileRules.find((x: FileRule) =>
        x.targetFileToCheck.test(file.filename)
      );

      if (fileMatch?.targetFileToExclude) {
        // Can disable the error message below because we are checking to see if
        // fileMatch.targetFileToExclude exists first
        // eslint-disable-next-line no-unsafe-optional-chaining
        for (const targetFilesToExclude of fileMatch?.targetFileToExclude) {
          // If any file contains an excluded name, exit out immediately
          if (targetFilesToExclude.test(file.filename)) {
            continue;
          }
        }
      }

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
          pullRequest.title
        ),
        scope: file.filename,
      });

      checkResults.concat({
        name: 'doesDependencyConformToRegexes',
        status: doesDependencyMatchAgainstRegexes(
          versions,
          fileMatch.regexForDepToInclude
        ),
        scope: file.filename,
      });

      checkResults.concat({
        name: 'isVersionValid',
        status: runVersioningValidation(versions),
        scope: file.filename,
      });

      checkResults.concat({
        name: 'isOneDependencyChanged',
        status: isOneDependencyChanged(file),
        scope: file.filename,
      });
    }
    return checkResults;
  }
}
