/*
Scenario 15: JavaScript module systems not covered by TS ESM scenarios.

Purpose:
- CommonJS exports
- module.exports object
- CJS async functions
*/

function cjsAdd(a, b) {
  return a + b;
}

async function cjsAsyncEcho(value) {
  return value;
}

function cjsUserLabel(user) {
  return `${user.id}:${user.name}`;
}

module.exports = {
  cjsAdd,
  cjsAsyncEcho,
  cjsUserLabel
};
