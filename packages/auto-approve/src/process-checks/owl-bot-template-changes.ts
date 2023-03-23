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
import {BaseLanguageRule} from './base';
import {TitleCheck} from '../checks/title-check';
import {AuthorCheck} from '../checks/author-check';
import {BodyCheck} from '../checks/body-check';
import {LibraryTypeCheck} from '../checks/library-type-check';

export class OwlBotTemplateChanges extends BaseLanguageRule {
  constructor(octokit: Octokit) {
    super(octokit);
    this.rules.concat(new TitleCheck(/\[autoapprove\]/));
    this.rules.concat(new TitleCheck(/(fix|feat|!)/, true));
    this.rules.concat(new AuthorCheck('gcf-owl-bot[bot]'));
    this.rules.concat(new BodyCheck(/PiperOrigin-RevId/));
    this.rules.concat(new LibraryTypeCheck(octokit, 'GAPIC_AUTO'));
  }
}
