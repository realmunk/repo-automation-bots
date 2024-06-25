// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import express, {Request, Response} from 'express';
import {Bootstrapper, BootstrapRequest, parseRepository} from 'googleapis-bootstrapper';

const app = express();

const bootstrapper = new Bootstrapper({
  projectId: 'FIXME',
});

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.post('/bootstrap', async (req: Request, res: Response) => {
  const bootstrapRequest = parseBootstrapRequest(req);
  const metadata = await bootstrapper.bootstrapLibrary(bootstrapRequest, {
    skipIssueOnFailure: true,
  });
  res.status(200).json(metadata);
});

app.listen(3000, () => {
  console.log('Example app listening on port 3000...');
});

function parseBootstrapRequest(request: Request): BootstrapRequest {
  const apiId = request.params['apiId'];
  const destinationRepository = request.params['destination_repo'];
  const language = request.params['language'];
  const languageContainer = request.params['language_container'];
  const sourceCl = parseInt(request.params['source_cl']);
  const serviceConfigPath = request.params['service_config_depot_path'];
  return {
    apiId,
    language,
    languageContainer,
    destinationRepository: parseRepository(destinationRepository),
    installationId: 1234,
    sourceCl,
    serviceConfigPath,
  };
}
