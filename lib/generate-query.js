'use strict';

const builder = require('mongo-sql');

function makeCreate(schema, force = false) {
  const commands = [];
  const builderOptions = {};
  if (force) {
    commands.push(Object.assign({}, builderOptions, {
      type: 'drop-table',
      table: schema.tableName,
      ifExists: true,
    }));
  }
  commands.push(Object.keys(schema.tableProperties).reduce((current, key) => {
    const result = current; 
    result.definition[key] = (typeof schema.tableProperties[key] === 'string')
      ? { type: schema.tableProperties[key], }
      : schema.tableProperties[key];
    return result;
  }, {
    type: 'create-table',
    table: schema.tableName,
    definition: {},
  }));
  console.log(commands);
  return commands.map(cmd => builder.sql(cmd).toString());
}

function makeQuery(table, options) {
  const builderOptions = {
    type: 'select',
    table,
  };
  return builder.sql(Object.assign({}, options, builderOptions)).toString();
}

module.exports = {
  makeCreate,
  makeQuery,
};