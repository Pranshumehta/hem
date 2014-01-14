fs         = require('fs-extra')
path       = require('path')
uglifyjs   = require('uglify-js')
uglifycss  = require('uglifycss')
Dependency = require('./dependency')
Stitch     = require('./stitch')
utils      = require('./utils')
events     = require('./events')
log        = require('./log')
versioning = require('./versioning')

# Thoughts..
# 1. use gaze/globule for defining files to compile/watch
# 2. seaparate compilers and minifiers
# 3. other translations after/before compile -> remove comments, append javascript, etc..
# 4. be sure to mention awesome modules in readme.md!!

# ------- Variables set by hem during startup

_hem  = undefined
_argv = undefined

# ------- Application Class

class Application
  constructor: (name, config = {}) ->
    @name  = name
    @route = config.route
    @root  = config.root

    # apply defaults, make this a require to load in?? TODO:
    if (config.extend)
      try
        # make sure we don't modify the original assets (which is cached by require)
        baseConfig = utils.loadAsset('config/' + config.extend)
        defaults   = utils.extend({}, baseConfig)
      catch err
        log.error "ERROR: Invalid 'extend' value provided: " + config.extend
        process.exit 1
      # create updated config mapping by merging with default values
      config = utils.extend(defaults, config)

    # set root variable, and possibly route
    unless @root
      # if application name is also a directory then assume that is root
      if utils.isDirectory(@name)
        @root    = @name
        @route or= "/#{@name}"
      # otherwise just work from top level directory
      else
        @root    = "/"
        @route or= "/"

    # make sure route has a value
    @static   = []
    @packages = []

    # configure static routes with base root and route values
    for route, value of config.static
      @static.push
        url  : @applyBaseRoute(route)
        path : @applyRootDir(value)[0]

    # configure js/css packages
    for key, value of config
      packager = undefined
      # determine package type
      if key is 'js' or utils.endsWith(key,'.js')
        packager = JsPackage
        value.name = key
      else if key is 'css' or utils.endsWith(key,'.css')
        packager = CssPackage
        value.name = key
      # add to @packages array
      if packager
        @packages.push(new packager(@, value))

    # configure test structure
    if config.test
      config.test.name = "test"
      @packages.push(new TestPackage(@, config.test))

    # simply mark a package as a 'test' package???
    # configure builder here... so far would have css builder and js builder, but could have more
    # resource builder, mover??? dependent on .js/.css extensions in package name

    # configure versioning
    if config.version
      verType = versioning[config.version.type]
      unless verType
        log.errorAndExit "Incorrect type value for version configuration: (#{config.version.type})"
      @versioning = new verType(@, config.version)

  getTestPackage: ->
    for pkg in @packages
      # simply mark packages as test: true
      return pkg if pkg.constructor.name is "TestPackage"

  isMatchingRoute: (route) ->
    # strip out any versioning applied to file
    if @versioning
      route = @versioning.trim(route)
    # compare against package route values
    for pkg in @packages
      return pkg if route is pkg.route
    # return nothing
    return

  unlink: ->
    log("Removing application: <green>#{@name}</green>")
    pkg.unlink() for pkg in @packages

  build: ->
    log("Building application: <green>#{@name}</green>")
    pkg.build() for pkg in @packages

  watch: ->
    log("Watching application: <green>#{@name}</green>")
    dirs = (pkg.watch() for pkg in @packages)
    # make sure dirs has valid values
    if dirs.length
      log.info("- Watching directories: <yellow>#{dirs}</yellow>")
    else
      log.info("- No directories to watch...")


  version: ->
    log("Versioning application: <green>#{@name}</green>")
    if @versioning
      @versioning.update()
    else
      log.errorAndExit "ERROR: Versioning not enabled in slug.json"

  applyRootDir: (value) ->
    # TODO: eventually use the Hem.home directory value if the home
    # TODO: value is different from the process.cwd() value?!
    values = utils.toArray(value)
    values = values.map (value) =>
      if utils.startsWith(value, "." + path.sep)
        value
      else
        utils.cleanPath(@root, value)
    values

  applyBaseRoute: (values...) ->
    values.unshift(@route) if @route
    utils.cleanRoute.apply(utils, values)

# ------- Public Functions

create = (name, config, hem, argv) ->
  _hem  or= hem
  _argv or= argv
  return new Application(name, config)

module.exports.create = create


