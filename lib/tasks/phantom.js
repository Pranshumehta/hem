// Generated by CoffeeScript 1.7.0
(function() {
  var async, err, events, fs, jasmine_checkTestResults, jasmine_parseTestResults, log, path, phantom, reporters, run, runBrowser, runPhantom, utils, waitFor;

  fs = require('fs');

  path = require('path');

  log = require('../log');

  utils = require('../utils');

  events = require('../events');

  async = require('async');

  run = function(apps, options) {
    var runTests;
    switch (options.runner) {
      case "phantom":
        runTests = phantom.run ? runPhantom : runBrowser;
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
    var app, open, q, task, taskObject, tasks, testFile, testName, _i, _len, _results;
    open = require("open");
    tasks = {};
    for (_i = 0, _len = apps.length; _i < _len; _i++) {
      app = apps[_i];
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
      _results = [];
      for (task in tasks) {
        taskObject = tasks[task];
        _results.push(events.on("watch", function(app, pkg, file) {
          return q.push(tasks[app.name]);
        }));
      }
      return _results;
    }
  };

  runPhantom = function(apps, options, done) {
    var app, q, task, taskObject, tasks, testFile, testName, testPort, _i, _len, _results;
    options.output || (options.output = "passOrFail");
    tasks = {};
    for (_i = 0, _len = apps.length; _i < _len; _i++) {
      app = apps[_i];
      testName = app.name;
      testFile = app.getTestPackage().getTestIndexFile();
      testPort = 12300 + Object.keys(tasks).length;
      tasks[testName] = (function(testName, testFile, testPort) {
        return function(done) {
          log("Testing application targets: <green>" + testName + "</green>");
          return phantom.run(testFile, options, function(results) {
            if (results.error) {
              log.error(results.error);
            }
            return done(null, results);
          }, testPort);
        };
      })(testName, testFile, testPort);
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
      _results = [];
      for (task in tasks) {
        taskObject = tasks[task];
        _results.push(events.on("watch", function(app, pkg, file) {
          return q.push(tasks[app.name]);
        }));
      }
      return _results;
    }
  };

  try {
    phantom = require('phantom');
  } catch (_error) {
    err = _error;
    phantom = void 0;
  }

  reporters = {
    errorsOnly: function(el, level, strong) {
      var desc, indent, tick;
      indent = function(level) {
        var i, ret, _i;
        ret = '';
        for (i = _i = 0; 0 <= level ? _i <= level : _i >= level; i = 0 <= level ? ++_i : --_i) {
          ret = ret + '  ';
        }
        return ret;
      };
      desc = function(el) {
        return $(el).find('> a.description')[0].text;
      };
      tick = function(el) {
        if ($(el).is('.passed')) {
          return '✓ ';
        } else {
          return '✖ ';
        }
      };
      if (typeof el === 'number') {
        return "Passed: " + el + ", Failed: " + level;
      } else if (!$(el).is(".passed")) {
        return indent(level) + tick(el) + desc(el);
      }
    },
    silent: function() {
      return "";
    },
    passOrFail: function(el, level, strong) {
      if (typeof el === 'number') {
        return "Passed: " + el + ", Failed: " + level;
      }
    },
    formatColors: function(el, level, strong) {
      var desc, indent, results, tick;
      indent = function(level) {
        var i, ret, _i;
        ret = '';
        for (i = _i = 0; 0 <= level ? _i <= level : _i >= level; i = 0 <= level ? ++_i : --_i) {
          ret = ret + '  ';
        }
        return ret;
      };
      tick = function(el) {
        if ($(el).is('.passed')) {
          return '\x1B[32m✓\x1B[0m';
        } else {
          return '\x1B[31m✖';
        }
      };
      desc = function(el, strong) {
        var ret;
        if (strong == null) {
          strong = false;
        }
        ret = $(el).find('> a.description');
        return ret = strong && '\x1B[1m' + ret[0].text || ret[0].text;
      };
      if (typeof el === 'number') {
        results = "-------------------------------------\n";
        results += "\x1B[32m✓\x1B[0m\x1B[1m Passed: \x1B[0m" + el;
        if (level > 0) {
          results += "\n\x1B[31m✖ \x1B[0m\x1B[1mFailed: \x1B[0m" + level;
        }
        return results;
      } else {
        return '\x1B[1m' + indent(level) + tick(el) + ' ' + desc(el, strong);
      }
    }
  };

  waitFor = (function() {
    var getTime;
    getTime = function() {
      return (new Date).getTime();
    };
    return function(test, doIt, duration) {
      var finish, int, looop, start;
      duration || (duration = 6000);
      start = getTime();
      finish = start + duration;
      int = void 0;
      looop = function() {
        var testCallback, time, timeout;
        time = getTime();
        timeout = time >= finish;
        testCallback = function(condition) {
          if (condition) {
            clearInterval(int);
            doIt(time - start);
          }
          if (timeout && !condition) {
            clearInterval(int);
            return doIt(0, "Timeout for page condition.");
          }
        };
        return test(testCallback);
      };
      return int = setInterval(looop, 1000);
    };
  })();

  jasmine_parseTestResults = function(report) {
    var failed, passed, printSpecs, printSuites;
    eval("report = " + report);
    printSuites = function(root, level) {
      level || (level = 0);
      return $(root).find('div.suite').each(function(i, el) {
        var output;
        output = report(el, level, true);
        if ($(el).parents('div.suite').length === level) {
          if (output) {
            window.callPhantom(output);
          }
          printSpecs(el, level + 1);
        }
        return printSuites(el, level + 1);
      });
    };
    printSpecs = function(root, level) {
      level || (level = 0);
      return $(root).find('> .specSummary').each(function(i, el) {
        var output;
        output = report(el, level);
        if (output) {
          return window.callPhantom(output);
        }
      });
    };
    printSuites($('div.jasmine_reporter'));
    failed = document.body.querySelectorAll('div.jasmine_reporter div.specSummary.failed').length;
    passed = document.body.querySelectorAll('div.jasmine_reporter div.specSummary.passed').length;
    window.callPhantom(report(passed, failed));
    return {
      passed: passed,
      failed: failed
    };
  };

  jasmine_checkTestResults = function(page) {
    return function(checkComplete) {
      var isCheckComplete;
      isCheckComplete = function() {
        var _ref;
        return (_ref = document.querySelector(".duration")) != null ? _ref.innerText : void 0;
      };
      return page.evaluate(isCheckComplete, checkComplete);
    };
  };

  run = function(filepath, options, callback, port) {
    if (port == null) {
      port = 12300;
    }
    log.info("Testing file <yellow>" + filepath + "</yellow> on port <blue>" + port + "</blue>");
    return phantom.create(function(ph) {
      return ph.createPage(function(page) {
        page.set('onConsoleMessage', function(msg) {
          return console.log(msg);
        });
        page.set('onCallback', function(msg) {
          if (msg) {
            return console.log(msg);
          }
        });
        return page.open(filepath, function(status) {
          var checkTestResults, complete, evalTestResults, parseTestResults, reporter;
          if (status !== "success") {
            ph.exit();
            callback({
              error: "Cannot open URL"
            });
            return;
          }
          checkTestResults = jasmine_checkTestResults(page);
          parseTestResults = jasmine_parseTestResults;
          complete = function(results) {
            ph.exit();
            return typeof callback === "function" ? callback(results) : void 0;
          };
          reporter = reporters[options.output];
          evalTestResults = function(time, err) {
            if (err) {
              return complete({
                error: err
              });
            } else {
              return page.evaluate(parseTestResults, complete, new String(reporter));
            }
          };
          return waitFor(checkTestResults, evalTestResults);
        });
      });
    }, {
      port: port
    });
  };

  if (phantom) {
    module.exports.run = run;
  } else {
    module.exports.run = function() {
      return log.error("Unable to require('phantom') npm module...");
    };
  }

  module.exports = function() {
    return function(next) {};
  };

}).call(this);