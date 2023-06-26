import { JSONSchema4 } from 'json-schema';
import { OpenAPIV3 } from 'openapi-types';
import pascalcase from 'pascalcase';

import { compileSchema } from './utils';

// 用法说明，参见测试用例
async function processArraySchema(
  arraySchema: OpenAPIV3.ArraySchemaObject,
  definitions: JSONSchema4['definitions'],
  name: string,
): Promise<{ itemName: string; itemType: string; typeName: string | undefined }> {
  const itemName = pascalcase(`${name}Item`);
  if ((arraySchema.items as OpenAPIV3.ReferenceObject).$ref) {
    const schema: OpenAPIV3.ReferenceObject = arraySchema.items as OpenAPIV3.ReferenceObject;
    const typeName = typeof schema.$ref == 'string' ? schema.$ref.split('/').pop() : schema.$ref;
    return {
      itemName,
      itemType: `export type ${itemName} = Types.${typeName}`,
      typeName,
    };
  }
  const itemType = await compileSchema(
    { ...arraySchema.items, id: itemName, definitions },
    itemName,
  );
  return {
    itemName,
    itemType,
    typeName: (arraySchema.items as OpenAPIV3.SchemaObject).type,
  };
}

// 用法说明，参见测试用例
export async function schemaToInlineTs(
  obj: OpenAPIV3.ParameterObject,
  definitions: JSONSchema4['definitions'],
): Promise<string> {
  const { schema, name: objName, required } = obj;
  const id = (schema as OpenAPIV3.SchemaObject)?.title || objName;
  if ((schema as OpenAPIV3.ArraySchemaObject).type === 'array') {
    const { typeName } = await processArraySchema(
      schema as OpenAPIV3.ArraySchemaObject,
      definitions,
      id,
    );
    return `${id}${!required ? '?' : ''}: ${typeName}[]`;
  }

  if ((schema as OpenAPIV3.ReferenceObject).$ref) {
    const typeName = (schema as OpenAPIV3.ReferenceObject).$ref.split('/').pop();
    return `${id}${!required ? '?' : ''}: ${typeName}`;
  }

  let tsStr = await compileSchema({ ...schema, id, description: '', definitions }, id);
  tsStr = tsStr
    .replace(/export (type|interface) (\w+) = /, `${id}${!required ? '?' : ''}: `)
    .trim();
  return tsStr.endsWith(';') ? tsStr.substring(0, tsStr.length - 1) : tsStr;
}

// 将 JSONSchema4 转为 Typescript 代码
// 用法说明，参见测试用例
export async function schemaToTs(
  schema: JSONSchema4 | undefined,
  name: string,
  definitions: JSONSchema4['definitions'],
): Promise<string | undefined> {
  if (!schema) return;
  if (schema.type === 'array') {
    const { itemName, itemType } = await processArraySchema(
      schema as OpenAPIV3.ArraySchemaObject,
      definitions,
      name,
    );
    return [
      itemType,
      schema.description && `/** ${schema.description} */`,
      `export type ${name} = ${itemName}[]`,
    ].join('\n');
  }
  // schema 最外层不可能是 $ref，需要处理
  if (schema.$ref) {
    const typeName = typeof schema.$ref == 'string' ? schema.$ref.split('/').pop() : schema.$ref;
    return `${
      schema.description ? `/** ${schema.description} */\n` : ''
    }export type ${name} = Types.${typeName}`;
  }
  return compileSchema({ ...schema, id: name, definitions }, name);
}

// 将 OpenAPI 中的 schema 转为 JSONSchema4 规范
// 用法说明，参见测试用例
export function changeOpenAPIToJSONSchema(
  openapiSchema: OpenAPIV3.SchemaObject & {
    schema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
  },
  name: string,
): undefined | JSONSchema4 {
  if (!openapiSchema) return;
  if (openapiSchema.type === 'array') {
    return openapiSchema;
  }
  const { schema, ...otherProperties } = openapiSchema;
  const res: JSONSchema4 = {
    id: name,
    ...otherProperties,
  };
  if (!schema) return res;
  if ((schema as OpenAPIV3.ReferenceObject).$ref) {
    if (typeof (schema as OpenAPIV3.ReferenceObject).$ref === 'string') {
      res.$ref = (schema as OpenAPIV3.ReferenceObject).$ref;
    }
  } else if (
    (schema as OpenAPIV3.ArraySchemaObject).type === 'array' ||
    (schema as OpenAPIV3.SchemaObject).type === 'object'
  ) {
    return {
      ...res,
      ...schema,
    };
  } else {
    res.properties = schema as JSONSchema4;
  }
  return res;
}

// 用法说明，参见测试用例
export function arraySchemaToTs(
  arr: OpenAPIV3.ParameterObject[] | undefined,
  name: string,
  definitions: JSONSchema4['definitions'],
): undefined | Promise<string> {
  if (!arr || !arr.length) return;
  const properties = arr.reduce((acc, cur) => {
    const { schema, name, description } = cur;
    acc[name] = { ...schema, description };
    return acc;
  }, {} as Record<any, JSONSchema4>);
  const schema: JSONSchema4 = {
    title: name,
    type: 'object',
    properties,
    definitions,
    required: arr.filter((item) => item.required).map((item) => item.name),
    additionalProperties: false,
  };
  return compileSchema(schema, name);
}

export interface Api {
  url: string;
  method: string;
  description?: string;
  operationId?: string;
  summary?: string;
  tags?: string[];
  params?: OpenAPIV3.ParameterObject[];
  query?: OpenAPIV3.ParameterObject[];
  cookie?: OpenAPIV3.ParameterObject[];
  header?: OpenAPIV3.ParameterObject[];
  response?: Record<
    string,
    { description?: string; schema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject }
  >;
  body?: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject;
}

type ResolverPromiseFn = (api: Api) => Promise<string | undefined> | undefined;

export interface ResolverType {
  fileName?: (api: Api) => string;
  url?: (api: Api) => string;
  method?: (api: Api) => string;
  fnName?: (api: Api) => string;
  fnComment?: (api: Api) => string | undefined;
  params?: ResolverPromiseFn;
  query?: ResolverPromiseFn;
  cookie?: ResolverPromiseFn;
  header?: ResolverPromiseFn;
  body?: ResolverPromiseFn;
  response?: ResolverPromiseFn;
}

export function getDefaultResolver(
  definitions: JSONSchema4['definitions'],
): Required<ResolverType> {
  return {
    fileName: ({ tags }) => tags?.[0] || 'anonymous', // 输出文件的名称
    url: ({ url }) => url.replace(/{/g, '${'), // api 接口名
    method: ({ method }) => method, // 类型
    fnComment: ({ description, summary }) => {
      if (!description && !summary) return;
      if (description) {
        description = description.replace(/\n/, '\n* ');
      }
      if (summary) {
        summary = summary.replace(/\n/, '\n* ');
      }
      if (description && summary) {
        return `
        /**
         * ${summary}
         *
         * @description ${description}
         */\n`;
      }
      return `
      /**
       * ${summary || description}
       */\n`;
    }, // 函数注释
    fnName: ({ operationId }) => operationId || 'anonymous', // 函数名称
    params: ({ params }) => {
      // 路径中的参数
      if (!params) return;
      return Promise.all(
        params.map(async (param) => await schemaToInlineTs(param, definitions)),
      ).then((arr) => arr.join(', '));
    },
    query: ({ query }) => arraySchemaToTs(query, 'Query', definitions),
    cookie: ({ cookie }) => arraySchemaToTs(cookie, 'Cookie', definitions),
    header: ({ header }) => arraySchemaToTs(header, 'Header', definitions),
    body: ({ body }) => (body ? schemaToTs(body, 'Body', definitions) : undefined),
    response: ({ response }) => {
      const data = response?.['200'] || response?.['default'];
      if (!data) return;
      return schemaToTs(changeOpenAPIToJSONSchema(data, 'Data'), 'Data', definitions);
    },
  };
}
