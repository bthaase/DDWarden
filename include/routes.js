var express = require("express");
var moment = require('moment');
var async = require('async');
var fs = require('fs');
var _ = require("lodash");

var Config = require('./config');
var Utils = require('./utils');
var NF = require('./collectors');
var DB = require('./db');

var route = new express.Router();

route.get("/api/devices", function(req, res) {
	var d = {};
	_.each(NF.Devices, function(v, k) { 
		if ( k == "00:00:00:00:00:00" ) return;
		d[k] = v; 
		d[k].mac = k; 
	});
	res.send(d);
});

route.post("/api/device/edit", function(req, res) {
	if ( req.body.mac && req.body.name ) {		
		NF.Devices[req.body.mac].name = req.body.name;
		console.log(("[Web] Updated nametag of " + req.body.mac + " to '" + req.body.name + "'").yellow);
	}
	res.status(200).send({ ok: true});
});

route.get("/api/db", function(req, res) {
	var bundle = {};
	
	var stats = fs.statSync(Config.DATABASE_FILENAME);
	bundle.dbSize = stats["size"];
	
	async.series([function (next) {			
		DB.all("SELECT COUNT(*) AS \"count\" FROM Traffic;", [], function(err, row) {
			if ( row.length > 0 ) bundle.trafficRows = row[0]["count"] || 0;
			next();
		});
	}, function(next) {
		DB.all("SELECT COUNT(*) AS \"count\" FROM Totals;", [], function(err, row) {
			if ( row.length > 0 ) bundle.totalsRows = row[0]["count"] || 0;
			next();
		});
	}, function(next) {
		DB.all("SELECT min(stamp) AS min FROM Totals WHERE stamp IS NOT NULL ORDER BY stamp DESC;", [], function(err, row) {
			if ( row.length > 0 ) bundle.minimumStamp = row[0]["min"] || 0;
			if ( bundle.minimumStamp ) bundle.minimumAge = moment.unix(bundle.minimumStamp * 60).toDate();
			next();
		});
	}], function done() {
		res.send(bundle);
	});	
});

route.post("/api/totals", function(req, res) {
	var timeframe = req.body.frame;
	// console.log(("[Web] Requesting totals with timeframe of " + timeframe).yellow);
	
	var since = Math.floor(moment().unix() / 60) - timeframe;
	var ends = Math.floor(moment().unix() / 60);
	
	if ( timeframe == -1 ) since = Math.floor(moment().startOf('month').unix() / 60);		// This month
	if ( timeframe == -2 ) {
		since = Math.floor(moment().subtract(1, 'month').startOf('month').unix() / 60);		// Last month
		ends = Math.floor(moment().subtract(1, 'month').endOf('month').unix() / 60);
	}
	
	var totals = { wanSent: 0, wanRecv: 0, dbSize: 0, trafficRows: 0, totalsRows: 0 };
	
	totals.begin = moment.unix(since * 60).format("MMMM Do YYYY, h:mm a");
	totals.end = "now";
	if ( timeframe == -2 ) totals.end = moment.unix(ends * 60).format("MMMM Do YYYY, h:mm a");
	
	totals.beginRaw = moment.unix(since * 60).toDate();
	totals.endRaw = moment().toDate();
	if ( timeframe == -2 ) totals.endRaw = moment.unix(ends * 60).toDate();
	
	var stats = fs.statSync(Config.DATABASE_FILENAME);
	totals.dbSize = stats["size"];
	
	async.series([function (next) {			
		DB.all("SELECT COUNT(*) AS \"count\" FROM Traffic;", [], function(err, row) {
			if ( row.length > 0 ) totals.trafficRows = row[0]["count"] || 0;
			next();
		});
	}, function(next) {
		DB.all("SELECT COUNT(*) AS \"count\" FROM Totals;", [], function(err, row) {
			if ( row.length > 0 ) totals.totalsRows = row[0]["count"] || 0;
			next();
		});
	}, function(next) {
		DB.each("SELECT * FROM Totals WHERE stamp >= " + since + " AND stamp <= " + ends, function(err, row) {
			// console.log("Parsing totals row from " + row.stamp + "...");
			totals.wanSent += row.wanSent;
			totals.wanRecv += row.wanRecv;
		}, function done() {
			res.send(totals);
			next();
		});		
	}]);	
});

route.post("/api/traffic", function(req, res) {
	var timeframe = req.body.frame;
	var mac = req.body.mac;
	
	// console.log(("[Web] Requesting traffic for " + mac + " with timeframe of " + timeframe).yellow);
	
	var since = Math.floor(moment().unix() / 60) - timeframe;
	var ends = Math.floor(moment().unix() / 60);
	
	if ( timeframe == -1 ) since = Math.floor(moment().startOf('month').unix() / 60);		// This month
	if ( timeframe == -2 ) {
		since = Math.floor(moment().subtract(1, 'month').startOf('month').unix() / 60);		// Last month
		ends = Math.floor(moment().subtract(1, 'month').endOf('month').unix() / 60);
	}
	
	var totals = { wanSent: 0, wanRecv: 0 };
	
	DB.each("SELECT * FROM Traffic WHERE mac = '" + mac + "' AND stamp >= " + since + " AND stamp <= " + ends, function(err, row) {
		// console.log("Parsing traffic row from " + row.stamp + "...");
		totals.wanSent += row.wanSent;
		totals.wanRecv += row.wanRecv;
	}, function done() {
		res.send(totals);
	});
});

route.post("/api/graph", function(req, res) {
	var filter = req.body.mac || null;
	
	var when = moment(req.body.target);
	var mode = req.body.mode;
	
	if ( req.body.target == -1 ) when = moment();
	if ( req.body.target == -2 ) when = moment().subtract(1, 'month');
	
	if ( mode != "year" && mode != "month" && mode != "day") return res.send({error: "Invalid mode"});
	
	var since = Math.floor(when.startOf(mode).unix() / 60);	
	var ends = Math.floor(when.endOf(mode).unix() / 60);
	
	var data = {};
	
	if ( mode == "day" ) {
		for( var i = since; i <= ends; i += 60 ) {
			var k = Math.floor(i/60);
			data[k] = { sent: 0, recv: 0, value: 0, name: moment.unix(i * 60).format("h a") };	
		}
	} else if ( mode == "month" ) {
		var c = moment.unix(since * 60);
		for ( var d = 1; d <= moment.unix(ends * 60).endOf('month').date(); d++ ) {
			var i = Math.floor(c.unix() / 60);
			if ( req.body.includeDay ) data[i] = { sent: 0, recv: 0, value: 0, name: moment.unix(i * 60).format("ddd Do") };	
			if ( !req.body.includeDay ) data[i] = { sent: 0, recv: 0, value: 0, name: moment.unix(i * 60).format("Do") };				
			c.add(1, 'day');
		}
	} else if ( mode == "year" ) {
		var m = when.startOf('year');
		for ( var i = 0; i < 12; i++ ) {
			var k = Math.floor(m.unix() / 60);
			data[k] = { sent: 0, recv: 0, value: 0, name: m.format("MMM") };	
			m.add(1, 'month');
		}
	}
	
	var query = "SELECT * FROM Totals WHERE stamp >= " + since + " AND stamp <= " + ends;
	if ( filter ) query = "SELECT * FROM Traffic WHERE mac = '" + filter + "' AND stamp >= " + since + " AND stamp <= " + ends;
	
	DB.each(query, function(err, row) {
		var k = null;
		if ( mode == "day" ) k = Math.floor(row.stamp / 60);
		if ( mode == "month" ) k = Math.floor((moment.unix(row.stamp * 60).startOf('day').unix()) / 60);
		if ( mode == "year" ) k = Math.floor((moment.unix(row.stamp * 60).startOf('month').unix()) / 60);
				
		// if ( !data[k] ) data[k] = { value: 0, name: moment.unix(row.stamp * 60).format("h a") };
		try {
			data[k].value += row.wanSent;
			data[k].value += row.wanRecv;
			data[k].sent += row.wanSent;
			data[k].recv += row.wanRecv;
		} catch(e) {
			// console.log(data);
			console.error("FAILED on '" + k + "' in mode " + mode + " (" + moment.unix(k * 60).format("ddd Do") + ")");
		}
	}, function done() {
		res.send(data);
	});		
});

module.exports = route;