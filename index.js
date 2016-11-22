'use strict';
/**
 * DD-Warden (Personal-use netflow collector for DD-WRT Routers)
 * 
 * Released under the GNU General Public License v3.0
 * 
 * @author Brian Haase
 * @version 1.0.1
 */
var colors = require('colors');
var sqlite3 = require("sqlite3").verbose();
var express = require('express');
var moment = require('moment');
var async = require('async');
var http = require('http');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

var Config = require('./include/config.js');
var Utils = require('./include/utils.js');
var Netflow = require('./include/collectors.js');
var DB = require('./include/db.js');

var app = null;

function onExpressError(error) {
  if (error.syscall !== 'listen') { throw error; }

  var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/*
 * Boot up sequence.
 */
async.series([function(next) {
	/*
	 * Prepare and start our Collectors
	 */
	console.log("[Boot] Preparing the Netflow collectors...".cyan);
	Netflow.prepare(function(e) {
		if ( e ) next(e);
		if ( !e ) Netflow.start(next);
	});
}, function(next) {
	/*
	 * Prepare and start our Express HTTP reporting server.
	 */
	console.log("[Boot] Preparing the Express HTTP Server...".cyan);
	
	app = express();
	
	app.use(require('body-parser').urlencoded({ extended: false }));
	app.use(require('body-parser').json());
	app.use(require('body-parser').json({type: 'application/vnd.api+json' }));
	app.use(express.static(path.join(__dirname, "html")));				// Static Files Location
	
	app.use(require('./include/routes.js'));
	
	app.use(function(req, res, next) { res.status(404).sendFile(__dirname + '/html/404.html'); });
	app.use(function(err, req, res, next) {
		console.error("[Express] An error occured with an express request: '" + err.message + "'");
		console.error(err);
		res.status(err.status || 500).send('error', { message: err.message, error: err });
	});

	var server = http.createServer(app);
	server.listen(Config.HTTP_PORT);
	server.on('error', onExpressError);
	server.on('listening', function() {
		var addr = server.address();
		var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
		console.log(("[Web] Express HTTP Server is listening on " + bind).magenta);
	});	
	
	next();
}], function done(err) {	
	if ( err ) {
		console.error("[Boot] Startup failed, an error has occured.".red);
		console.error(err);
	} else {
		console.log("[Boot] Startup completed, Warden is available.".green);
	}
});
