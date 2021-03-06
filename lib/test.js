// Generated by CoffeeScript 1.12.7
(function() {
  var async, createKarmaFileList, events, fs, log, path, phantom, run, runBrowser, runKarma, utils,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  fs = require('fs');

  path = require('path');

  log = require('./log');

  utils = require('./utils');

  events = require('./events');

  phantom = require('./phantom');

  async = require('async');

  run = function(apps, options) {
    var runTests;
    switch (options.runner) {
      case "karma":
        runTests = runKarma;
        break;
      case "browser":
        runTests = runBrowser;
        break;
      default:
        log.errorAndExit("Invalid or unset test runner value: <yellow>" + options.runner + "</yellow>");
    }
    return runTests(apps, options);
  };

  runBrowser = function(apps, options, done) {
    var app, i, len, open, q, tasks, testFile, testName;
    open = require("open");
    tasks = {};
    for (i = 0, len = apps.length; i < len; i++) {
      app = apps[i];
      testName = app.name;
      testFile = app.getTestPackage().getTestIndexFile();
      tasks[testName] = (function(testFile) {
        return function(done) {
          open(testFile);
          return done();
        };
      })(testFile);
    }
    if (options.singleRun) {
      return async.series(tasks);
    } else {
      q = async.queue((function(task, callback) {
        return task(callback);
      }), 1);
      return events.on("watch", function(app, pkg, file) {
        return q.push(tasks[app.name]);
      });
    }
  };

  runKarma = function(apps, options) {
    var app, i, karma, len, q, tasks, testConfig;
    if (options == null) {
      options = {};
    }
    karma = require('karma').Server;
    tasks = {};
    options.reporters || (options.reporters = 'progress');
    options.frameworks || (options.frameworks = 'jasmine');
    options.browsers || (options.browsers = 'PhantomJS');
    options.reporters = Array.isArray(options.reporters) || options.reporters.split(/[ ,]+/);
    options.frameworks = Array.isArray(options.frameworks) || options.frameworks.split(/[ ,]+/);
    options.browsers = Array.isArray(options.browsers) || options.browsers.split(/[ ,]+/);
    for (i = 0, len = apps.length; i < len; i++) {
      app = apps[i];
      testConfig = {
        singleRun: true,
        autoWatch: false,
        basePath: options.basePath,
        logLevel: options.logLevel || 'error',
        reporters: options.reporters,
        frameworks: options.frameworks,
        browsers: options.browsers,
        preprocessors: options.preprocessors || null
      };
      testConfig.files = createKarmaFileList(app);
      testConfig.coverageReporter = options.coverageReporter || null;
      if (indexOf.call(testConfig.reporters, 'junit') >= 0) {
        testConfig.junitReporter = {
          outputFile: app.name + '-test-results.xml',
          suite: app.name,
          outputDir: '.',
          useBrowserName: false
        };
      }
      tasks[app.name] = (function(app, testConfig) {
        return function(done) {
          var callback, server;
          log("Testing application targets: <green>" + app.name + "</green>");
          callback = function(exitCode) {
            return done(null, {
              failed: exitCode
            });
          };
          server = new karma(testConfig, callback);
          return server.start();
        };
      })(app, testConfig);
    }
    if (options.singleRun) {
      return async.series(tasks, function(err, results) {
        var exitCode, name, result;
        exitCode = 0;
        for (name in results) {
          result = results[name];
          exitCode += result.failed && result.failed || 0;
          exitCode += result.error && 1 || 0;
        }
        return process.exit(exitCode);
      });
    } else {
      q = async.queue((function(task, callback) {
        return task(callback);
      }), 1);
      return events.on("watch", function(app, pkg, file) {
        return q.push(tasks[app.name]);
      });
    }
  };

  createKarmaFileList = function(app) {
    var files, i, len, ref, target;
    files = [];
    ref = app.getTestPackage().getAllTestTargets(false);
    for (i = 0, len = ref.length; i < len; i++) {
      target = ref[i];
      files.push(target.path);
    }
    return files;
  };

  module.exports.run = run;

  module.exports.phantom = phantom;

}).call(this);
