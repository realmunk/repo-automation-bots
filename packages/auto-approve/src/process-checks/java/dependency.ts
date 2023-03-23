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

import {Octokit} from '@octokit/rest';
import {FileRule, PullRequest, CheckResult} from '../../interfaces';
import {BaseLanguageRule} from '../base';
import {TitleCheck} from '../../checks/title-check';
import {AuthorCheck} from '../../checks/author-check';
import {MaxFilesCheck} from '../../checks/max-files-check';
import {AllowedFilesCheck} from '../../checks/allowed-files-check';
import {
  getJavaVersions,
  doesDependencyChangeMatchPRTitleJava,
  runVersioningValidation,
  isOneDependencyChanged,
} from '../../utils-for-pr-checking';

export class JavaDependency extends BaseLanguageRule {
  fileRules: FileRule[] = [
    {
      targetFileToCheck: /pom.xml$/,
      // This would match: chore(deps): update dependency com.google.cloud:google-cloud-datacatalog to v1.4.2 or chore(deps): update dependency com.google.apis:google-api-services-policytroubleshooter to v1-rev20210319-1.32.1
      dependencyTitle: new RegExp(
        /^(fix|chore)\(deps\): update dependency (@?\S*) to v(\S*)$/
      ),
      /* This would match:
          <groupId>com.google.apis</groupId>
          <artifactId>google-api-services-policytroubleshooter</artifactId>
          -      <version>v1-rev20210319-1.31.5</version>
          or
          <groupId>com.google.apis</groupId>
          <artifactId>google-api-services-policytroubleshooter</artifactId>
          -     <version>v1-rev20210319-1.31.5</version>
        */
      oldVersion: new RegExp(
        /<groupId>(?<oldDependencyNamePrefixPom>[^<]*)<\/groupId>[\s]*<artifactId>(?<oldDependencyNamePom>[^<]*)<\/artifactId>[\s]*-[\s]*<version>(?:v[0-9]-rev(?<oldRevVersionPom>[0-9]*)-(?<oldMajorRevVersionPom>[0-9]*)\.(?<oldMinorRevVersionPom>[0-9]*\.[0-9])|(?<oldMajorVersionPom>[0-9]*)\.(?<oldMinorVersionPom>[0-9]*\.[0-9]*))<\/version>[\s]*/
      ),
      /* This would match:
          <groupId>com.google.cloud</groupId>
          <artifactId>google-cloud-datacatalog</artifactId>
    -     <version>1.4.1</version>
    +     <version>1.4.2</version>
          or
           <groupId>com.google.apis</groupId>
           <artifactId>google-api-services-policytroubleshooter</artifactId>
    -      <version>v1-rev20210319-1.31.5</version>
    +      <version>v1-rev20210319-1.32.1</version>
        */
      newVersion: new RegExp(
        /<groupId>(?<newDependencyNamePrefixPom>[^<]*)<\/groupId>[\s]*<artifactId>(?<newDependencyNamePom>[^<]*)<\/artifactId>[\s]*-[\s]*<version>(?:v[0-9]-rev[0-9]*-[0-9]*\.[0-9]*\.[0-9]|[[0-9]*\.[0-9]*\.[0-9]*)<\/version>[\s]*\+[\s]*<version>(v[0-9]-rev(?<newRevVersionPom>[0-9]*)-(?<newMajorRevVersionPom>[0-9]*)\.(?<newMinorRevVersionPom>[0-9]*\.[0-9])|(?<newMajorVersionPom>[0-9]*)\.(?<newMinorVersionPom>[0-9]*\.[0-9]*))<\/version>/
      ),
    },
    {
      targetFileToCheck: /build.gradle$/,
      // This would match: chore(deps): update dependency com.google.cloud:google-cloud-datacatalog to v1.4.2 or chore(deps): update dependency com.google.apis:google-api-services-policytroubleshooter to v1-rev20210319-1.32.1
      dependencyTitle: new RegExp(
        /^(fix|chore)\(deps\): update dependency (@?\S*) to v(\S*)$/
      ),
      /* This would match either
    -    invoker 'com.google.cloud.functions.invoker:java-function-invoker:1.0.2
    -    classpath 'com.google.cloud.tools:endpoints-framework-gradle-plugin:1.0.3'
    -def grpcVersion = '1.40.1'
    */
      oldVersion: new RegExp(
        /-(?:[\s]*(?:classpath|invoker)[\s]'(?<oldDependencyNameBuild>.*):(?<oldMajorVersionBuild>[0-9]*)\.(?<oldMinorVersionBuild>[0-9]*\.[0-9]*)|def[\s](?<oldGrpcVersionBuild>grpcVersion)[\s]=[\s]'(?<oldMajorVersionGrpcBuild>[0-9]*)\.(?<oldMinorVersionGrpcBuild>[0-9]*\.[0-9]*))/
      ),
      /* This would match either:
    +    invoker 'com.google.cloud.functions.invoker:java-function-invoker:1.0.2
    +    classpath 'com.google.cloud.tools:endpoints-framework-gradle-plugin:1.0.3'
    +def grpcVersion = '1.40.1'
    */
      newVersion: new RegExp(
        /\+(?:[\s]*(?:classpath|invoker)[\s]'(?<newDependencyNameBuild>.*):(?<newMajorVersionBuild>[0-9]*)\.(?<newMinorVersionBuild>[0-9]*\.[0-9]*)|def[\s](?<newGrpcVersionBuild>grpcVersion)[\s]=[\s]'(?<newMajorVersionGrpcBuild>[0-9]*)\.(?<newMinorVersionGrpcBuild>[0-9]*\.[0-9]*))/
      ),
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
    this.rules.concat(new MaxFilesCheck(50));
    this.rules.concat(new AllowedFilesCheck(/pom.xml$/, /build.gradle$/));
  }

  async additionalChecks(pullRequest: PullRequest): Promise<CheckResult[]> {
    const checkResults: CheckResult[] = [];
    for (const file of pullRequest.changedFiles) {
      const fileRule = this.fileRules.find((x: FileRule) =>
        x.targetFileToCheck.test(file.filename)
      );

      if (!fileRule) {
        continue;
      }

      const versions = getJavaVersions(
        file,
        fileRule.oldVersion,
        fileRule.newVersion
      );

      if (!versions) {
        checkResults.concat({
          name: 'javaDependencyCheck',
          status: false,
        });
        continue;
      }

      checkResults.concat({
        name: 'doesDependencyMatch',
        status: doesDependencyChangeMatchPRTitleJava(
          versions,
          // We can assert this exists since we're in the class rule that contains it
          fileRule.dependencyTitle!,
          pullRequest.title
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
