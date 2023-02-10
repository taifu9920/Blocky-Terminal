var path = require('path'),
  util = require('util'),
  querystring = require('querystring'),
  child_process = require('child_process');

var engine = function (filePath, opts, callback) {
  function objectToQueryString(obj) {
    let queryString = '';
    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        obj[key].forEach(function (value) {
          queryString += `${key}[]=${value}&`;
        });
      } else {
        queryString += `${key}=${obj[key]}&`;
      }
    }
    return queryString.slice(0, -1);
  }
  var FILES = {
    upload: {
      name: [],
      type: [],
      tmp_name: [],
      error: [],
      size: []
    }
  };
  var binPath = this.binPath,
    runnerPath = this.runnerPath,
    displayErrors = this.displayErrors,

    method = opts.method || 'GET',
    get = opts.get || {},
    post = opts.post || {},
    files = opts.files || [],

    query = opts.query || objectToQueryString(get),
    body = opts.body || objectToQueryString(post),

    env = {
      REQUEST_METHOD: method,
      CONTENT_LENGTH: body.length,
      QUERY_STRING: query
    };


  if (files.length > 0) files.forEach(item => {
    FILES.upload.name.push(item.originalname);
    FILES.upload.type.push(item.mimetype);
    FILES.upload.tmp_name.push(item.path.replaceAll("\\", "/").replaceAll("filesys/php/", ""));
    FILES.upload.error.push(0);
    FILES.upload.size.push(item.size);
  })
  else FILES = undefined;
  filesString = FILES != undefined ? JSON.stringify(FILES).replaceAll('"', '\\"') : "";
  env["FILES_LENGTH"] = filesString.length;
  var command = util.format(
    '%s %s %s %s',
    (body || filesString ? `php -r "echo '${body}${filesString}';" | ` : '') + binPath,
    runnerPath,
    path.dirname(filePath),
    filePath
  );
  child_process.exec(command, {
    env: env
  }, function (error, stdout, stderr) {
    if (error) {

      // can leak server configuration
      if (displayErrors && stdout) {
        callback(stdout);
      } else {
        callback(error);
      }
    } else if (stdout) {
      callback(null, stdout);
    } else if (stderr) {
      callback(stderr);
    } else {
      callback(null, null);
    }
  });
};

module.exports = engine;
