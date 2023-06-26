import * as path from 'path';

import { getOpenApiDoc } from '../getOpenApiDoc';

const success = (api: any) => async () => {
  const res = await getOpenApiDoc(api);
  expect(res.openapi).not.toBeNull();
};

const error = (api: any) => (callback) => {
  const fn = jest.fn();
  const errorFn = console.error;
  console.error = () => {};
  getOpenApiDoc(api)
    .catch(fn)
    .finally(() => {
      expect(fn).toBeCalled();
      callback();
      console.error = errorFn;
    });
};

describe('参数为文件路径', () => {
  test('相对路径', success('./src/__tests__/resource/openapi.json'));

  test('绝对路径', success(path.join(__dirname, 'resource/openapi.json')));

  test('不是有效文件', error(__filename));

  test('路径不存在', error('xxx.json'));
  test('路径不是文件', error('./'));
});

describe('参数为对象', () => {
  test(
    '正常 openapi 对象',
    success({
      openapi: '3.0.3',
      paths: {
        '/example/test': {
          get: {
            tags: ['TestController'],
            summary: '测试方法Method',
            description: 'TestController.jest 测试案例controller ',
            operationId: 'TestController.get.jest.nShpPrzJNj',
            responses: {
              '200': {
                description: '',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        code: {
                          type: 'number',
                          description: '接口返回code码字段',
                        },
                        data: {
                          type: 'object',
                          properties: {
                            metadata: {
                              type: 'object',
                              properties: {
                                orgcode: {
                                  type: 'string',
                                },
                                appid: {
                                  type: 'string',
                                },
                                'trace-id': {
                                  type: 'string',
                                },
                              },
                            },
                            orgcode: {
                              type: 'string',
                              description: '租户号',
                            },
                            userInfo: {
                              type: 'object',
                              properties: {
                                name: {
                                  type: 'string',
                                  description: '姓名',
                                },
                                age: {
                                  type: 'number',
                                  description: '年龄',
                                },
                                company: {
                                  type: 'string',
                                  description: '公司',
                                },
                              },
                              required: ['name', 'age', 'company'],
                            },
                            response: {
                              type: 'object',
                              properties: {
                                name: {
                                  type: 'string',
                                },
                                age: {
                                  type: 'string',
                                },
                                orgcode: {
                                  type: 'string',
                                },
                              },
                              required: ['name', 'age', 'orgcode'],
                            },
                          },
                          required: ['metadata', 'userInfo'],
                        },
                        msg: {
                          type: 'string',
                          description: '接口返回信息字段',
                        },
                      },
                      required: ['code', 'data'],
                    },
                  },
                },
              },
            },
            parameters: [
              {
                name: 'orgcode',
                in: 'header',
                description: '@HeaderParam, 类型：string',
                required: true,
                schema: {
                  type: 'string',
                },
              },
              {
                name: 'name',
                in: 'query',
                description: 'name字段 (@QueryParam, 类型：string)',
                required: true,
                schema: {
                  type: 'string',
                },
              },
              {
                name: 'age',
                in: 'query',
                description: '年龄 (@QueryParam, 类型：number)',
                required: true,
                schema: {
                  type: 'number',
                },
              },
            ],
          },
        },
      },
    }),
  );

  test(
    '不正常 openapi 对象',
    error({
      name: 'foo',
      age: 10,
    }),
  );
});
