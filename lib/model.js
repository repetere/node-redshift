const join = require('path').join;
const fs = require('fs');
const Bluebird = require('bluebird');
const folderName = 'redshift_models';
const ORM = require('./orm');
const Redshift = require('./connection');
const generateQuery = require('./generate-query')

const template = [
  "'use strict';"
  , "var model = require('node-redshift').model;"
  , "var person = {"
  , "  'tableName': 'people',"
  , "  'tableProperties': {"
  , "    'id': {"
  , "      'type': 'key'"
  , "    },"
  , "    'name': { "
  , "      'type': 'string',"
  , "      'required': true"
  , "    },"
  , "    'email': { "
  , "      'type': 'string',"
  , "      'required': true"
  , "    }"
  , "  }"
  , "};"
  , "module.exports = person;"
].join('\n');

function create(name) {
  try {
    fs.mkdirSync(folderName, 0774);
  } catch (err) {
    // ignore
  }
  var path = join(folderName, name + '.js');
  fs.writeFileSync(path, template);
}

module.exports.create = create;

Redshift.prototype.import = function (schema) {
  console.log({ schema });
  Redshift.prototype.models = Redshift.prototype.models || [];
  const model = (typeof name === 'string')
    ? require(schema)
    : schema;
  if (model.tableName && Redshift.prototype.models[model.tableName]) {
    return Redshift.prototype.models[model.tableName];
  }
  if (typeof model != 'object') {
    throw new Error('Cannot build without an object');
  }
  if (model.hasOwnProperty('tableName') == false && model.tableName != null) {
    throw new Error('Cannot build without a tableName to connect');
  }
  if (model.hasOwnProperty('tableProperties') == false && model.tableProperties != null) {
    throw new Error('Cannot build without tableProperties to export');
  }

  let _return = Bluebird.promisifyAll(new ORM(this));
  _return.tableName = model.tableName;
  _return.tableProperties = model.tableProperties;

  Redshift.prototype.models[model.tableName] = _return;
  return _return;
};

Redshift.prototype.sync = function(options = { force: false, }) {
  return Bluebird.map(Object.keys(Redshift.prototype.models), key => {
    const query = generateQuery.makeCreate(Redshift.prototype.models[key], options.force);
    const rawQuery = Bluebird.promisify(this.rawQuery.bind(this));
    let syncCommand;
    if (options.force) {
      syncCommand = rawQuery(query[0], true);
    }
    return (syncCommand)
      ? syncCommand.then((res1) => (
        Bluebird.all([res1, rawQuery(query[1])])
      ))
      : rawQuery(query[0]);
  });
}

module.exports.sync = Redshift.prototype.sync;
module.exports.import = Redshift.prototype.import;
