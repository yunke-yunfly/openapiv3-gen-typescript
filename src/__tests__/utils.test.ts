import {
  changeRefValue,
  compileSchema,
  getDefinitions,
  replaceComponentCircularRef,
} from '../utils';

describe('utils', () => {
  describe('getDefinitions', () => {
    test('当无 definitions 时，应返回空对象', () => {
      expect(getDefinitions({} as any)).toEqual({});
      expect(getDefinitions({ components: {} } as any)).toEqual({});
      expect(getDefinitions({ components: { schemas: {} } } as any)).toEqual({});
    });

    test('当 requestBodies 或 schemas 为 ref 时，转为空对象', () => {
      const openapi: any = {
        components: {
          schemas: { $ref: '#/xxx' },
          requestBodies: { $ref: '#/xxx' },
        },
      };
      expect(getDefinitions(openapi as any)).toEqual({});
    });

    test('当有 requestBodies 时，需要进行处理', () => {
      const openapi = {
        components: {
          requestBodies: {
            Foo: {
              content: {
                'application/json': {
                  schema: {
                    properties: {
                      Id: {
                        description: 'ID',
                        type: 'string',
                      },
                    },
                    title: 'foo title',
                    type: 'object',
                  },
                },
              },
              description: 'foo',
            },
            Bar: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Bar',
                  },
                },
              },
              description: 'Bar',
            },
          },
          schemas: {
            Zoo: {
              type: 'string',
              format: 'number',
            },
          },
        },
      };
      expect(getDefinitions(openapi as any)).toEqual({
        Foo: {
          properties: {
            Id: {
              description: 'ID',
              type: 'string',
            },
          },
          title: 'foo title',
          type: 'object',
          description: 'foo',
        },
        Zoo: {
          type: 'string',
          format: 'number',
        },
      });
    });

    test('有循环应用的情况，需要替换', () => {
      const openapi = {
        components: {
          requestBodies: {
            Foo: {
              content: {
                'application/json': {
                  schema: {
                    properties: {
                      Id: {
                        description: 'ID',
                        type: 'string',
                      },
                    },
                    title: 'foo title',
                    type: 'object',
                  },
                },
              },
              description: 'foo',
            },
          },
          schemas: {
            Zoo: {
              type: 'string',
              format: 'number',
            },

            CircularRef: {
              additionalProperties: false,
              properties: {
                children: {
                  $ref: '#/definitions/CircularRef',
                },
              },
              required: ['children'],
              type: 'object',
            },
          },
        },
      };
      expect(getDefinitions(openapi as any)).toEqual({
        Foo: {
          properties: {
            Id: {
              description: 'ID',
              type: 'string',
            },
          },
          title: 'foo title',
          type: 'object',
          description: 'foo',
        },
        Zoo: {
          type: 'string',
          format: 'number',
        },
        CircularRef: {
          additionalProperties: false,
          properties: {
            children: {
              title: 'CircularRef_____OpenapiGenRequestAnyToReplace',
              type: 'any',
            },
          },
          required: ['children'],
          type: 'object',
        },
      });
    });
  });

  describe('changeRefValue', () => {
    test('将 #/components/schemas/Foo 替换成 #/definitions/Foo', () => {
      const openapi = {
        paths: {
          '/foo': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Foo',
                    },
                  },
                },
              },
            },
          },
          '/bar': {
            post: {
              requestBody: {
                $ref: '#/components/requestBodies/Bar',
              },
            },
          },
        },
        components: {
          requestBodies: {
            Bar: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Foo',
                  },
                },
              },
            },
          },
          schemas: {
            Foo: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                  format: 'int64',
                },
              },
            },
            Zoo: {
              type: 'object',
              properties: {
                category: {
                  $ref: '#/components/schemas/Bar',
                },
              },
            },
          },
        },
      };

      const result = {
        paths: {
          '/foo': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/definitions/Foo',
                    },
                  },
                },
              },
            },
          },
          '/bar': {
            post: {
              requestBody: {
                $ref: '#/definitions/Bar',
              },
            },
          },
        },
        components: {
          requestBodies: {
            Bar: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/definitions/Foo',
                  },
                },
              },
            },
          },
          schemas: {
            Foo: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                  format: 'int64',
                },
              },
            },
            Zoo: {
              type: 'object',
              properties: {
                category: {
                  $ref: '#/definitions/Bar',
                },
              },
            },
          },
        },
      };

      expect(changeRefValue(openapi as any)).toEqual(result);
    });

    test('foo.bar => FooBar', () => {
      const openapi: any = {
        paths: {
          '/foo': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/foo.bar',
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            'foo.bar': {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                  format: 'int64',
                },
              },
            },
          },
        },
      };

      const result = {
        paths: {
          '/foo': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/definitions/FooBar',
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            FooBar: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                  format: 'int64',
                },
              },
            },
          },
        },
      };

      expect(changeRefValue(openapi)).toEqual(result);
    });
  });
  describe('compileSchema', () => {
    test('无循环引用的情况, 直接调用库返回结果', async () => {
      const result = await compileSchema(
        {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              format: 'int32',
            },
          },
          additionalProperties: false,
        },
        'Foo',
      );
      expect(result).toEqual(`export interface Foo {\nid?: number\n}\n`);
    });

    test('有循环引用的情况, 替换循环应用，并返回结果', async () => {
      const result = await compileSchema(
        {
          additionalProperties: false,
          properties: {
            children: {
              title: 'CircularRef_____OpenapiGenRequestAnyToReplace',
              type: 'any',
            },
          },
          required: ['children'],
          type: 'object',
        },
        'CircularRef',
      );
      expect(result.replace(/\n/g, '')).toEqual(
        'export interface CircularRef {children: CircularRef}',
      );
    });
  });

  // 循环应用部分
  describe('replaceComponentCircularRef', () => {
    const definitions = {
      CircularRef: {
        additionalProperties: false,
        properties: {
          children: {
            $ref: '#/definitions/CircularRef',
          },
        },
        required: ['children'],
        type: 'object',
      },
      ArrayCircularRef: {
        items: {
          anyOf: [
            {
              $ref: '#/definitions/ArrayCircularRef',
            },
            {
              type: 'number',
            },
          ],
        },
        type: 'array',
      },
      ArrayItemsCircularRef: {
        items: [
          {
            anyOf: [
              {
                $ref: '#/definitions/ArrayItemsCircularRef',
              },
              {
                type: 'number',
              },
            ],
          },
          {
            $ref: '#/definitions/ArrayItemsCircularRef',
          },
        ],
        type: 'array',
      },

      CommonRef: {
        additionalProperties: false,
        properties: {
          age: {
            type: 'number',
          },
          children: {
            $ref: '#/definitions/CircularRef',
          },
          name: {
            type: 'string',
          },
        },
        required: ['name', 'age', 'children'],
        type: 'object',
      },
    };

    Object.keys(definitions).forEach((key: string) => {
      const component = definitions[key];
      replaceComponentCircularRef(component, key);
    });

    const result = {
      ArrayCircularRef: {
        items: {
          anyOf: [
            {
              title: 'ArrayCircularRef_____OpenapiGenRequestAnyToReplace',
              type: 'any',
            },
            {
              type: 'number',
            },
          ],
        },
        type: 'array',
      },
      ArrayItemsCircularRef: {
        items: [
          {
            anyOf: [
              {
                title: 'ArrayItemsCircularRef_____OpenapiGenRequestAnyToReplace',
                type: 'any',
              },
              {
                type: 'number',
              },
            ],
          },
          {
            title: 'ArrayItemsCircularRef_____OpenapiGenRequestAnyToReplace',
            type: 'any',
          },
        ],
        type: 'array',
      },
      CircularRef: {
        additionalProperties: false,
        properties: {
          children: {
            title: 'CircularRef_____OpenapiGenRequestAnyToReplace',
            type: 'any',
          },
        },
        required: ['children'],
        type: 'object',
      },
      CommonRef: {
        additionalProperties: false,
        properties: {
          age: {
            type: 'number',
          },
          children: {
            $ref: '#/definitions/CircularRef',
          },
          name: {
            type: 'string',
          },
        },
        required: ['name', 'age', 'children'],
        type: 'object',
      },
    };
    expect(definitions).toEqual(result);
  });
});
