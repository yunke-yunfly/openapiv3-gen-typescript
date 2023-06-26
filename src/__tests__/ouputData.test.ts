import {
  combineSingleApi,
  combineSingleType,
  getApiDTs,
  getApis,
  getCommonDTs,
  getOutputData,
} from '../outputData';

describe('outputData', () => {
  describe('getCommonDTs', () => {
    test('当无值是时候，返回 undefined', async () => {
      const res = await getCommonDTs(undefined);
      expect(res).toBe(undefined);
    });
    test('正常编译多个 definitions', async () => {
      const definitions: any = {
        Foo: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '这是 ID',
            },
          },
          required: ['id'],
          additionalProperties: false,
        },
        Bar: {
          type: 'object',
          properties: {
            zoo: {
              $ref: '#/definitions/Foo',
            },
          },
          required: ['zoo'],
          additionalProperties: false,
        },
      };
      const res = await getCommonDTs(definitions);

      expect(res.fileName).toBe('common.d.ts');
      expect(res.content).toBe(`export interface Foo {
/**
 * 这是 ID
 */
id: string
}
export interface Bar {
zoo: Foo
}`);
    });
  });

  describe('combineSingleType', () => {
    test('有 response、fnComment、successResponseTemplate', () => {
      const api: any = {
        fnName: 'getUser',
        fnComment: `/**
                    * 我是注释
                    */\n`,
        body: `
          export interface Body {
            name: string;
          }
        `,
        query: `
          export interface Query {
            age: number;
          }
        `,
        response: `
          export interface Response {
            id: number
          }
        `,
      };
      expect(
        combineSingleType(api, { successResponseTemplate: `{code: number; data: T}` } as any),
      ).toMatchSnapshot();
    });

    test('无 response 且无 successResponseTemplate', () => {
      const api: any = {
        fnName: 'get_user',
        body: `
          export interface Body {
            name: string;
          }
        `,
      };
      expect(combineSingleType(api, {} as any)).toMatchSnapshot();
    });
  });

  describe('combineSingleApi', () => {
    test('参数齐全', () => {
      const api: any = {
        fnName: 'getUser',
        fnComment: `/**
                    * 我是注释
                    */\n`,
        body: `
          export interface Body {
            name: string;
          }
        `,
        query: `
          export interface Query {
            age: number;
          }
        `,
        header: `
          export interface Header {
            orgcode: number;
          }
        `,
        response: `
          export interface Response {
            id: number
          }
        `,
        params: `name: string, age: number`,
        method: 'POST',
        url: '/user/${name}',
      };

      expect(combineSingleApi(api)).toMatchSnapshot();
    });

    test('query、body、header、cookie、params 不存在时', () => {
      const api: any = {
        fnName: 'getUser',
        url: '/user',
      };

      expect(combineSingleApi(api)).toMatchSnapshot();
    });
  });

  describe('getApiDTs', () => {
    test('正常渲染', () => {
      const apis = [
        {
          fnName: 'getUser',
          fileName: 'user',
          url: '/user',
        },
        {
          fnName: 'createUser',
          fileName: 'user',
          url: '/user',
        },
        {
          fnName: 'createTeam',
          fileName: 'team',
          url: '/team',
        },
      ];

      expect(getApiDTs(apis as any, {} as any)).toMatchSnapshot();
    });

    test('包含 Types ', () => {
      const apis = [
        {
          fnName: 'getUser',
          fileName: 'user',
          url: '/user',
          response: `
            interface Data {
              userInfo: Types.UserInfo
            }
          `,
        },
      ];

      expect(getApiDTs(apis as any, {} as any)).toMatchSnapshot();
    });
  });

  describe('getApis', () => {
    test('正常渲染', () => {
      const apis = [
        {
          fnName: 'getUser',
          fileName: 'user',
          url: '/user',
        },
        {
          fnName: 'createUser',
          fileName: 'user',
          url: '/user',
        },
        {
          fnName: 'createTeam',
          fileName: 'team',
          url: '/team',
        },
      ];

      expect(
        getApis(
          apis as any,
          { requestTemplate: 'import { request } from "../utils/request"' } as any,
        ),
      ).toMatchSnapshot();
    });

    test('config.requestTemplate 无值', () => {
      const apis = [
        {
          fnName: 'getUser',
          fileName: 'user',
          url: '/user',
        },
      ];

      expect(getApis(apis as any, { axiosFilePath: '../utils/request' } as any)).toMatchSnapshot();
    });
  });

  describe('getOutputData', () => {
    test('有 definitions', async () => {
      const apis: any = [
        {
          fnName: 'getUser',
          fileName: 'user',
          url: '/user',
        },
      ];

      const definitions = {
        Foo: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '这是 ID',
            },
          },
          required: ['id'],
          additionalProperties: false,
        },
      };
      const res = await getOutputData(apis, definitions as any, {} as any);
      expect(res).toMatchSnapshot();
    });

    test('无 definitions', async () => {
      const apis: any = [
        {
          fnName: 'getUser',
          fileName: 'user',
          url: '/user',
        },
      ];
      const res = await getOutputData(apis, {} as any, {} as any);
      expect(res).toMatchSnapshot();
    });
  });
});
