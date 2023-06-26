const path = require('path');

module.exports = {
  openapi: path.join(__dirname, './openapi.json'),
  outputDir: path.join(__dirname, '../../../__tests_output__/genRequestByMiddleman'),
};
