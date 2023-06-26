import path from 'path';

import { processConfig } from '../config';
import { getDefaultResolver } from '../resolver';

describe('config', () => {
  test('outputDir 不存在应报错', () => {
    expect(() => processConfig({} as any, {})).toThrowError();
  });

  test('requestTemplate 存在时，应包含 request 导出', () => {
    expect(() =>
      processConfig({ outputDir: 'dist', requestTemplate: 'aa' } as any, {}),
    ).toThrowError();
  });

  test('使用默认值', () => {
    const res = processConfig(
      {
        outputDir: 'dist',
      } as any,
      {},
    );
    expect(res).toEqual({
      outputDir: path.join(__dirname, '../../dist'),
      axiosFilePath: 'axios',
      resolver: expect.any(Object),
      bannerComment: expect.any(String),
    });
  });

  test('覆盖默认值', () => {
    const fileName = jest.fn();
    const fnComment = jest.fn();

    const res = processConfig(
      {
        outputDir: path.resolve(__dirname, 'dist'),
        axiosFilePath: path.resolve(__dirname, '../utils'),
        resolver: { fileName, fnComment },
        bannerComment: '123',
        requestTemplate: 'import { request } from "../utils"',
      } as any,
      {},
    );
    expect(res).toEqual({
      outputDir: path.resolve(__dirname, 'dist'),
      axiosFilePath: path.join('../../../utils'),
      resolver: expect.any(Object),
      bannerComment: '123',
      requestTemplate: 'import { request } from "../utils"',
    });

    expect(res.resolver.fileName).toBe(fileName);
    expect(res.resolver.fnComment).toBe(fnComment);
  });
});
