/*
 * Include the configuration file
 */
var colors = require('colors');
var fs = require('fs');
 
module.exports = {};

try {
	module.exports = JSON.parse(fs.readFileSync("./config/config.json", 'utf8'));
} catch(e) {
	console.error("[Config] An error occured attempting to parse the ./config/config.json file.".red);
	console.error(e);
	process.exit(1);
}

if ( !module.exports ) module.exports = {};

// Optional environmental overrides.
if ( process.env.DDWARDEN_DATABASE ) module.exports.DATABASE_FILENAME = process.env.DDWARDEN_DATABASE;
if ( process.env.DDWARDEN_RFLOW_PORT ) module.exports.RFLOW_PORT = parseInt(process.env.DDWARDEN_RFLOW_PORT);
if ( process.env.DDWARDEN_MACUPD_PORT ) module.exports.MACUPD_PORT = parseInt(process.env.DDWARDEN_MACUPD_PORT);
if ( process.env.DDWARDEN_HTTP_PORT ) module.exports.HTTP_PORT = parseInt(process.env.DDWARDEN_HTTP_PORT);