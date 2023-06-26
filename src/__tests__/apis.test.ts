import { getApis } from '../apis';

describe('apis', () => {
  test('getApis', () => {
    const openapi = require('./resource/openapi.json');
    expect(getApis(openapi)).toMatchSnapshot();
  });
});
