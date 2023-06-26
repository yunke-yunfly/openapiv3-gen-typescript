import type { OpenAPIV3 } from 'openapi-types';

import type { Api, ResolverType } from './resolver';

// 获取简化的数据
export function getApis(openApiDoc: OpenAPIV3.Document): Api[] {
  const paths = openApiDoc.paths;
  return Object.keys(paths)
    .map((url) => {
      const methods: string[] = Object.keys(paths[url] || {});
      return methods.map((method) => {
        const {
          description,
          operationId,
          summary,
          tags,
          parameters = [],
          requestBody,
          responses,
        } = ((paths[url] as any)?.[method] || {}) as OpenAPIV3.OperationObject;
        const parametersObject = parameters.filter(
          (item) => !(item as OpenAPIV3.ReferenceObject).$ref,
        ) as OpenAPIV3.ParameterObject[];
        return {
          url,
          method,
          description,
          operationId,
          summary,
          tags,
          params: parametersObject.filter((item) => item.in === 'path'),
          query: parametersObject.filter((item) => item.in === 'query'),
          cookie: parametersObject.filter((item) => item.in === 'cookie'),
          header: parametersObject.filter((item) => item.in === 'header'),
          response: Object.keys(responses).reduce((acc, statusCode) => {
            if (!(responses[statusCode] as OpenAPIV3.ReferenceObject)['$ref']) {
              const { content = {}, description } = responses[
                statusCode
              ] as OpenAPIV3.ResponseObject;
              const schema = Object.keys(content).map((type) => content[type].schema);

              acc[statusCode] = {
                description,
                schema: schema[0],
              };
            } else {
              acc[statusCode] = {
                schema: responses[statusCode] as OpenAPIV3.ReferenceObject,
              };
            }
            return acc;
          }, {} as Record<string, { description?: string; schema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject }>),
          body: (() => {
            if (!requestBody) return;
            return (requestBody as OpenAPIV3.ReferenceObject)?.['$ref']
              ? (requestBody as OpenAPIV3.ReferenceObject)
              : Object.keys((requestBody as OpenAPIV3.RequestBodyObject)?.content).map(
                  (type) => (requestBody as OpenAPIV3.RequestBodyObject)?.content[type].schema,
                )[0];
          })(),
        };
      });
    })
    .flat();
}

// 解析数据
export type ResolvedApisType = Record<keyof ResolverType, string | undefined>;
export function resolveApis(
  apis: Api[],
  resolver: Required<ResolverType>,
): Promise<ResolvedApisType[]> {
  return Promise.all(
    apis.map(async (api) => ({
      fileName: resolver.fileName(api),
      url: resolver.url(api),
      method: resolver.method(api),
      fnComment: resolver.fnComment(api),
      fnName: resolver.fnName(api),
      params: await resolver.params(api),
      query: await resolver.query(api),
      cookie: await resolver.cookie(api),
      header: await resolver.header(api),
      body: await resolver.body(api),
      response: await resolver.response(api),
    })),
  );
}
