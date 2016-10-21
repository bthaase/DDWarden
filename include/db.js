var Config = require('./config.js');
var sqlite3 = require("sqlite3").verbose();
var colors = require('colors');
var fs = require('fs');
var _ = require('lodash');

console.log("[Boot] Preparing the SQLite3 database...".cyan);
console.log(("[Boot]  Database location is '" + Config.DATABASE_FILENAME + "'").cyan);

var dbExists = fs.existsSync(Config.DATABASE_FILENAME);
var db = module.exports = new sqlite3.Database(Config.DATABASE_FILENAME);

if ( !dbExists ) {
	db.serialize(function() {
		db.run("CREATE TABLE Totals (stamp INT, wanSent INT, wanRecv INT, resolution INT);");
		db.run("CREATE TABLE Traffic (mac TEXT, ip TEXT, stamp INT, wanSent INT, wanRecv INT, resolution INT);");
		db.run("CREATE TABLE Devices (mac TEXT, ip TEXT, host TEXT, name TEXT, discovered INT, lastseen INT)");	
		db.run("CREATE UNIQUE INDEX macIdx ON Devices(mac)");
	});
}

db.run("VACUUM");
