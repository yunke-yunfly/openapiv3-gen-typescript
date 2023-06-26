import type { JSONSchema4 } from 'json-schema';
import { compile } from 'json-schema-to-typescript';
import type { OpenAPIV3 } from 'openapi-types';
import pascalcase from 'pascalcase';

const compileConfig = {
  bannerComment: '', // 不要注释
  unknownAny: false, // 不将 any 转为 unknown
  unreachableDefinitions: false, // 不自动生成 Definitions 的 ts
  format: false, // 不需要格式化
};

const REPLACE_SUFFIX = '_____OpenapiGenRequestAnyToReplace';

const re1 = new RegExp(`export type .+${REPLACE_SUFFIX} = any\n`, 'g');

const re2 = new RegExp(`${REPLACE_SUFFIX}`, 'g');

/**
 *
 * 替换递归引用的ref
 * @param {JSONSchema4} component
 * @param {string} firstKey
 * @return {*}
 */
export function replaceComponentCircularRef(
  component: JSONSchema4 | undefined,
  firstKey: string,
): any {
  if (!component) {
    return;
  }

  if (component.$ref && component.$ref.replace(/^#\/definitions\//, '') === firstKey) {
    delete component.$ref;
    component.type = 'any';
    component.title = `${firstKey}${REPLACE_SUFFIX}`;
    return;
  }

  if (component.type === 'object') {
    const properties = component.properties || {};
    Object.keys(properties).forEach((childKey: string) => {
      replaceComponentCircularRef(properties[childKey], firstKey);
    });
    return;
  }

  if (component.type === 'array') {
    const items = component.items || {};
    if (Array.isArray(items)) {
      items.forEach((item: JSONSchema4) => {
        replaceComponentCircularRef(item, firstKey);
      });
    } else {
      replaceComponentCircularRef(items, firstKey);
    }
    return;
  }

  (component.allOf || component.anyOf || component.oneOf || []).forEach((item: JSONSchema4) => {
    replaceComponentCircularRef(item, firstKey);
  });

  replaceComponentCircularRef(component.not, firstKey);
}

export function compileSchema(schema: JSONSchema4, name: string): Promise<string> {
  return compile(schema, name, compileConfig).then((res) => res.replace(re1, '').replace(re2, ''));
}

/**
 * 将 openapi3 中的 $ref 的值更改为 definitions
 * 因为 #/components/schemas 不是 JSONSchema4 的标准，#/definitions 才是
 */
export function changeRefValue(openApiDoc: OpenAPIV3.Document): OpenAPIV3.Document {
  // inner_log.AttributeChange.OpType -> InnerLogAttributeChangeOpType
  return JSON.parse(
    JSON.stringify(openApiDoc)
      .replace(/components\/(schemas|requestBodies)/g, 'definitions')
      .replace(/"((\w+\.)+\w+)":{/g, (_, str) => `"${pascalcase(`${str.split('.').join(' ')}`)}":{`)
      .replace(
        /definitions\/((\w+\.)+\w+)/g,
        (_, str) => `definitions/${pascalcase(`${str.split('.').join(' ')}`)}`,
      ),
  );
}

// 获取 definitions 的内容
export function getDefinitions(openApiDoc: OpenAPIV3.Document): JSONSchema4['definitions'] {
  let schemas = openApiDoc?.components?.schemas || {};
  if (schemas['$ref']) {
    schemas = {};
  }

  let requestBodies = openApiDoc?.components?.requestBodies || {};
  if (requestBodies['$ref']) {
    requestBodies = {};
  }

  const formattedRequestBodies = Object.keys(requestBodies).reduce((acc, key) => {
    const item = requestBodies[key];
    const itemData = (item as any)?.['content']?.['application/json'];
    if (itemData && itemData.schema && !itemData.schema['$ref']) {
      acc[key] = {
        ...itemData.schema,
        description: (item as OpenAPIV3.RequestBodyObject).description,
      };
    }
    return acc;
  }, {} as any);

  const definitions: { [k: string]: JSONSchema4 } = Object.assign(
    {},
    formattedRequestBodies,
    schemas,
  );

  // json-schema-to-typescript库无法解析 递归循环(https://github.com/APIDevTools/json-schema-ref-parser/issues/37)
  // 替换掉 引用自身的ref，避免循环引用导致 Maximum call stack size exceeded
  Object.keys(definitions).forEach((key: string) => {
    const component = definitions[key];
    replaceComponentCircularRef(component, key);
  });
  return definitions;
}
