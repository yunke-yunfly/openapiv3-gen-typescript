import fs from 'fs';
import path from 'path';

import del from 'del';

import { genRequest, getGenData } from '../index';

test('getGenData', async () => {
  const res = await getGenData({
    openapi: path.resolve(__dirname, './resource/openapi.json'),
    outputDir: './dist',
  } as any);
  expect(res).toMatchSnapshot(res);
});

test('genRequest', async () => {
  const resolver = {
    fileName: ({ tags }) => tags![0].replace('Controller', '').toLowerCase(),
    fnName: ({ operationId }) => {
      const arr = operationId!.split('.');
      return arr.length >= 2 ? arr[2] : arr[0];
    },
  };

  const outputDir = path.resolve(__dirname, '../../__tests_output__/genRequest');
  await del([outputDir], { force: true });
  await genRequest({
    openapi: path.resolve(__dirname, './resource/openapi.json'),
    resolver,
    outputDir,
  } as any);
  expect(fs.existsSync(outputDir)).toBe(true);
  expect(fs.existsSync(path.join(outputDir, 'common.d.ts')));
  expect(fs.existsSync(path.join(outputDir, 'types.d.ts')));
  expect(fs.existsSync(path.join(outputDir, 'types')));
  expect(fs.existsSync(path.join(outputDir, 'apis')));
  await del([outputDir], { force: true });
});
