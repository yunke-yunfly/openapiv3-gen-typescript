import {
  changeOpenAPIToJSONSchema,
  getDefaultResolver,
  schemaToInlineTs,
  schemaToTs,
} from '../resolver';

describe('resolver', () => {
  describe('getDefaultResolver', () => {
    const defaultResolver = getDefaultResolver({});
    describe('fileName', () => {
      test('有 tags，则返回 tags 第一项', () => {
        expect(defaultResolver.fileName({ tags: ['aaa'] } as any)).toBe('aaa');
      });

      test('无 tags, 则返回 anonymous', () => {
        expect(defaultResolver.fileName({} as any)).toBe('anonymous');
      });
    });

    describe('url', () => {
      test('无路径参数的', () => {
        expect(defaultResolver.url({ url: '/foo/bar' } as any)).toBe('/foo/bar');
      });

      test('有路径参数的', () => {
        expect(defaultResolver.url({ url: '/foo/{id}' } as any)).toBe('/foo/${id}');
      });
    });

    describe('method', () => {
      test('正确返回 method', () => {
        expect(defaultResolver.method({ method: 'get' } as any)).toBe('get');
      });
    });

    describe('fnComment', () => {
      test('description 和 summary 都没有，应返回 undefined', () => {
        expect(defaultResolver.fnComment({} as any)).toBe(undefined);
      });
      test('description 或 summary 其中有一个，应返回其中之一', () => {
        const result = `
      /**
       * xxx
       */\n`;
        expect(defaultResolver.fnComment({ description: 'xxx' } as any)).toBe(result);
        expect(defaultResolver.fnComment({ summary: 'xxx' } as any)).toBe(result);
      });

      test('能正确处理 description 多行注释', () => {
        expect(defaultResolver.fnComment({ description: 'aaa\nbbb' } as any)).toBe(`
      /**
       * aaa
* bbb
       */\n`);
      });

      test('能正确处理 summary 多行注释', () => {
        expect(defaultResolver.fnComment({ summary: 'aaa\nbbb' } as any)).toBe(`
      /**
       * aaa
* bbb
       */\n`);
      });

      test('description 和 summary 都存在，则都应该返回', () => {
        expect(defaultResolver.fnComment({ summary: 'aaa', description: 'bbb' } as any)).toBe(`
        /**
         * aaa
         *
         * @description bbb
         */\n`);
      });
    });

    describe('fnName', () => {
      test('当有 operationId 时，返回 operationId', () => {
        expect(defaultResolver.fnName({ operationId: 'getUser' } as any)).toBe('getUser');
      });

      test('当无 operationId 时，返回 anonymous', () => {
        expect(defaultResolver.fnName({} as any)).toBe('anonymous');
      });
    });

    describe('params', () => {
      test('当无路径参数时，则返回 undefined', () => {
        expect(defaultResolver.params({} as any)).toBe(undefined);
      });

      test('当有路径参数时，转为 ts 定义', async () => {
        const schema: any = {
          params: [
            {
              name: 'groupId',
              in: 'path',
              required: true,
              schema: {
                type: 'integer',
                format: 'int64',
              },
            },
            {
              name: 'teamId',
              in: 'path',
              required: true,
              schema: {
                type: 'integer',
                format: 'int64',
              },
            },
          ],
        };
        const result = await defaultResolver.params(schema);
        expect(result).toBe('groupId: number, teamId: number');
      });
    });
    describe('response', () => {
      test('response 数据不存在，则应该返回 undefined', () => {
        expect(defaultResolver.response({} as any)).toBe(undefined);
      });

      test('response 数据存在，则应该正确转换', async () => {
        const schema: any = {
          response: {
            '200': {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                  format: 'int64',
                },
              },
              additionalProperties: false,
            },
          },
        };
        const result = `export interface Data {
id?: number
}
`;
        expect(await defaultResolver.response(schema)).toBe(result);
      });
    });

    describe('body', () => {
      test('body 数据不存在，则应该返回 undefined', () => {
        expect(defaultResolver.body({} as any)).toBe(undefined);
      });

      test('body 可以正确转换', async () => {
        const schema: any = {
          body: {
            type: 'object',
            properties: {
              username: {
                type: 'string',
              },
            },
            required: ['username'],
            additionalProperties: false,
          },
        };
        const result = `export interface Body {
username: string
}
`;
        expect(await defaultResolver.body(schema)).toBe(result);
      });
    });

    test('query 可以正确转换', async () => {
      const schema: any = {
        query: [
          {
            name: 'username',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
      };
      const result = `export interface Query {
username: string
}
`;
      expect(await defaultResolver.query(schema)).toBe(result);
    });

    test('cookie 可以正确转换', async () => {
      const schema: any = {
        cookie: [
          {
            name: 'username',
            in: 'cookie',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
      };
      const result = `export interface Cookie {
username: string
}
`;
      expect(await defaultResolver.cookie(schema)).toBe(result);
    });
    test('header 可以正确转换', async () => {
      const schema: any = {
        header: [
          {
            name: 'username',
            in: 'header',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
      };
      const result = `export interface Header {
username: string
}
`;
      expect(await defaultResolver.header(schema)).toBe(result);
    });

    test('header 为空时，应返回 undefined', async () => {
      expect(await defaultResolver.header({} as any)).toBe(undefined);
    });

    test('header 为空数组时，应返回 undefined', async () => {
      expect(await defaultResolver.header({ header: [] } as any)).toBe(undefined);
    });
  });

  describe('changeOpenAPIToJSONSchema', () => {
    test('当 openapi schema 为空时，应返回 undefined', () => {
      expect(changeOpenAPIToJSONSchema(undefined, 'Foo')).toBe(undefined);
    });

    test('当类型为数组时，则直接返回', () => {
      const openapiSchema: any = { type: 'array', items: { $ref: '#/components/xxx' } };
      expect(changeOpenAPIToJSONSchema(openapiSchema, 'Foo')).toEqual(openapiSchema);
    });

    test('当无字段里无 schema 时，应返回返回结构后的对象', () => {
      const openapiSchema: any = {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            format: 'int64',
          },
        },
        additionalProperties: false,
      };

      expect(changeOpenAPIToJSONSchema(openapiSchema, 'Foo')).toEqual({
        id: 'Foo',
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            format: 'int64',
          },
        },
        additionalProperties: false,
      });
    });

    test('当字段里有 schema，且为 { $ref: string }, 则 res.$ref = schema.$ref', () => {
      const openapiSchema: any = {
        schema: {
          $ref: '#/components/xx',
        },
        additionalProperties: false,
      };
      expect(changeOpenAPIToJSONSchema(openapiSchema, 'Foo')).toEqual({
        id: 'Foo',
        $ref: '#/components/xx',
        additionalProperties: false,
      });
    });

    test('当字段里有 schema 时，且 { type: "array" } | { type: "object" } 时，则需要合并 schema', () => {
      const openapiSchema: any = {
        schema: {
          type: 'array',
          items: {
            $ref: '#/components/xxx',
          },
        },
        additionalProperties: false,
      };

      expect(changeOpenAPIToJSONSchema(openapiSchema, 'Foo')).toEqual({
        id: 'Foo',
        type: 'array',
        items: {
          $ref: '#/components/xxx',
        },
        additionalProperties: false,
      });
    });

    test('其他情况，schema 转为属性字段', () => {
      const openapiSchema: any = {
        schema: {
          aaa: 'number',
        },
        additionalProperties: false,
      };

      expect(changeOpenAPIToJSONSchema(openapiSchema, 'Foo')).toEqual({
        id: 'Foo',
        properties: {
          aaa: 'number',
        },
        additionalProperties: false,
      });
    });
  });

  describe('schemaToTs', () => {
    test('无 schema 时，返回 undefined', async () => {
      expect(await schemaToTs(undefined, 'Foo', {})).toBe(undefined);
    });

    test('当为普通类型时，转为普通类型', async () => {
      const schema: any = {
        type: 'object',
        properties: {
          username: {
            type: 'string',
          },
        },
        required: ['username'],
        additionalProperties: false,
      };
      const res = await schemaToTs(schema, 'Foo', {});
      expect(res).toBe('export interface Foo {\nusername: string\n}\n');
    });

    test('当 schema 中包含 $ref 时，应正确解析', async () => {
      const schema: any = {
        $ref: '#/components/schemas/GetActDetailsResponse',
      };
      const res = await schemaToTs(schema, 'Foo', {});
      expect(res).toBe(`export type Foo = Types.GetActDetailsResponse`);
    });

    test('当 schema 中包含 $ref 且有 description 字段时，应正确解析', async () => {
      const schema: any = {
        description: '我是注释',
        $ref: '#/components/schemas/GetActDetailsResponse',
      };
      const res = await schemaToTs(schema, 'Foo', {});
      expect(res).toBe(`/** 我是注释 */\nexport type Foo = Types.GetActDetailsResponse`);
    });

    test('当为数组时，且数组为 $ref，应返回数组类型', async () => {
      const schema: any = {
        type: 'array',
        items: {
          $ref: '#/components/schemas/UserInfo',
        },
      };
      const res = await schemaToTs(schema, 'Foo', {});
      expect(res).toBe(`export type FooItem = Types.UserInfo\n\nexport type Foo = FooItem[]`);
    });

    test('当为数组时，数组为正常属性，应正确解析', async () => {
      const schema: any = {
        type: 'array',
        description: '我是注释',
        items: {
          type: 'string',
        },
      };
      const res = await schemaToTs(schema, 'Foo', {});
      expect(res).toBe(
        `export type FooItem = string\n\n/** 我是注释 */\nexport type Foo = FooItem[]`,
      );
    });
  });

  describe('schemaToInlineTs', () => {
    test('当 schema 为普通对象，应返回类型', async () => {
      const schema: any = {
        name: 'aaa',
        schema: {
          type: 'integer',
          format: 'int64',
        },
      };
      const res = await schemaToInlineTs(schema, {});
      expect(res).toBe('aaa?: number');
    });

    test('当 schema 为必填时，应正确解析', async () => {
      const schema: any = {
        name: 'aaa',
        required: true,
        schema: {
          type: 'integer',
          format: 'int64',
        },
      };
      const res = await schemaToInlineTs(schema, {});
      expect(res).toBe('aaa: number');
    });

    test('当 schema 包含 $ref 时', async () => {
      const schema: any = {
        name: 'aaa',
        schema: {
          $ref: '#/components/Foo',
        },
        required: true,
      };
      const res = await schemaToInlineTs(schema, {});
      expect(res).toBe('aaa: Foo');
    });

    test('当 schema 为数组时，应正确解析为数组类型', async () => {
      const schema: any = {
        name: 'aaa',
        schema: {
          type: 'array',
          items: {
            type: 'number',
          },
        },
        required: true,
      };
      const res = await schemaToInlineTs(schema, {});
      expect(res).toBe('aaa: number[]');
    });

    test('当 schema 为数组时，且数组为 $ref 时，应正确解析为数组类型', async () => {
      const schema: any = {
        name: 'aaa',
        schema: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/UserInfo',
          },
        },
        required: true,
      };
      const res = await schemaToInlineTs(schema, {});
      expect(res).toBe('aaa: UserInfo[]');
    });
  });
});
