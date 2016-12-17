// Copyright 2015-2016, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const extend = require('lodash').assign;
const mysql = require('mysql');
const config = require('../config');

function getConnection () {
  const options = {
    user: config.get('MYSQL_USER'),
    password: config.get('MYSQL_PASSWORD'),
    database: 'winelist'
  };

  if (config.get('INSTANCE_CONNECTION_NAME') && config.get('NODE_ENV') === 'production') {
    options.socketPath = `/cloudsql/${config.get('INSTANCE_CONNECTION_NAME')}`;
  }

  return mysql.createConnection(options);
}

// [START list]
function list (limit, token, cb) {
  token = token ? parseInt(token, 10) : 0;
  const connection = getConnection();
  connection.query(
    'SELECT * FROM `wine` LIMIT ? OFFSET ?', [limit, token],
    (err, results) => {
      if (err) {
        cb(err);
        return;
      }
      const hasMore = results.length === limit ? token + results.length : false;
      cb(null, results, hasMore);
    }
  );
  connection.end();
}
// [END list]

// [START create]
function create (data, cb) {
  const connection = getConnection();
  connection.query('INSERT INTO `wine` SET ?', data, (err, res) => {
    if (err) {
      cb(err);
      return;
    }
    read(res.insertId, cb);
  });
  connection.end();
}
// [END create]

function read (id, cb) {
  const connection = getConnection();
  connection.query(
    'SELECT * FROM `wine` WHERE `id` = ?', id, (err, results) => {
      if (err) {
        cb(err);
        return;
      }
      if (!results.length) {
        cb({
          code: 404,
          message: 'Not found'
        });
        return;
      }
      cb(null, results[0]);
    });
  connection.end();
}

// [START update]
function update (id, data, cb) {
  const connection = getConnection();
  connection.query(
    'UPDATE `wine` SET ? WHERE `id` = ?', [data, id], (err) => {
      if (err) {
        cb(err);
        return;
      }
      read(id, cb);
    });
  connection.end();
}
// [END update]

function _delete (id, cb) {
  const connection = getConnection();
  connection.query('DELETE FROM `wine` WHERE `id` = ?', id, cb);
  connection.end();
}

module.exports = {
  createSchema: createSchema,
  list: list,
  create: create,
  read: read,
  update: update,
  delete: _delete
};

if (module === require.main) {
  const prompt = require('prompt');
  prompt.start();

  console.log(
    `Running this script directly will allow you to initialize your mysql database.
    This script will not modify any existing tables.`);

  prompt.get(['user', 'password'], (err, result) => {
    if (err) {
      return;
    }
    createSchema(result);
  });
}

function createSchema (config) {
  const connection = mysql.createConnection(extend({
    multipleStatements: true
  }, config));

  connection.query(
    `CREATE DATABASE IF NOT EXISTS \`winelist\`
      DEFAULT CHARACTER SET = \'utf8\'
      DEFAULT COLLATE \'utf8_general_ci\';
    USE \`winelist\`;
    CREATE TABLE IF NOT EXISTS \`winelist\`.\`wine\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`winery\` VARCHAR(255) NULL,
      \`wine\` VARCHAR(255) NULL,
      \`vintage\` INT,
      \`bottles\` INT,
      \`notes\` TEXT NULL,
    PRIMARY KEY (\`id\`));`,
    (err) => {
      if (err) {
        throw err;
      }
      console.log('Successfully created schema');
      connection.end();
    }
  );
}
