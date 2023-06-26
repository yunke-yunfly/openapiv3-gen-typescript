import fs from 'fs';
import path from 'path';

import del from 'del';

import { genRequestByMiddleman, getConfig, getConfigFile } from '../genRequestByMiddleman';

describe('genRequestByMiddleman', () => {
  describe('getConfigFile', () => {
    test('正常获取', () => {
      const workspace = path.join(__dirname, './resource');
      const spy = jest.spyOn(process, 'cwd');
      spy.mockReturnValue(workspace);
      const res = getConfigFile();
      expect(res).toEqual(expect.any(Object));
      spy.mockRestore();
    });

    test('异常情况', () => {
      expect(() => getConfigFile()).toThrowError();
    });
  });

  describe('getConfig', () => {
    test('正常获取', () => {
      const config = { openapi: './openapiv3.json' };
      expect(getConfig({ openapi: './openapiv3.json' } as any)).toEqual({
        ...config,
        outputDir: path.join(process.cwd(), './src/api'),
        header: false,
        cookie: false,
      });
    });
  });

  describe('genRequestByMiddleman', () => {
    test('正常生成', async () => {
      const workspace = path.join(__dirname, './resource');
      const spy = jest.spyOn(process, 'cwd');
      const outputDir = path.join(process.cwd(), '__tests_output__/genRequestByMiddleman');
      await del([outputDir], { force: true });
      spy.mockReturnValue(workspace);
      await genRequestByMiddleman();
      expect(fs.existsSync(outputDir)).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'types.d.ts'))).toBe(true);
    });
  });
});
