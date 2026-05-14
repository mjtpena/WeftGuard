const path = require('path');

exports.run = async function run() {
  const tests = require(path.resolve(__dirname, 'weftguardExtension.test.js'));
  await tests.run();
};
