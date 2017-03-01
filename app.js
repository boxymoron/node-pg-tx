'use strict';

const CLUSTER = require('cluster');

if (CLUSTER.isMaster) {
	const NUM_WORKERS = require('os').cpus().length;
	//const NUM_WORKERS = 1;
    console.log('Master cluster starting up with ' + NUM_WORKERS + ' workers...');
    
    CLUSTER.on('online', worker => {
        console.log('Worker ' + worker.process.pid + ' is online');
    });

    CLUSTER.on('exit', (worker, code, signal) => {
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
        console.log('Starting a new worker');
        CLUSTER.fork();
    });

    for (var i = 0; i < NUM_WORKERS; i++) {
    	CLUSTER.fork();
    }
} else {
  
	const express = require('express');
	const favicon = require('serve-favicon');
	const bodyParser = require('body-parser');
	const methodOverride = require('method-override');
	const errorhandler = require('errorhandler');
	const ejs = require('ejs');
	
	const morgan = require('morgan');
	const fs = require('fs');
	
	const HTTP = require('http');
	global.HTTP = HTTP;
	
	const HTTPS = require('https');
	global.HTTPS = HTTPS;
	
	const path = require('path');
	
	const db = require('./service/database');
	global.db = db;
	
	const xmljs = require('libxmljs');
	global.xmljs = xmljs;
	
	const cheerio = require('cheerio');
	global.cheerio = cheerio;
	
	const routes = require('./routes');
	const about = require('./routes/about');
	const fib = require('./routes/fib');

	const APP = express();

	// all environments
	APP.set('port', process.env.PORT || 8888);
	
	APP.engine('.html', ejs.__express);
	APP.set('view engine', 'html');
	APP.set('views', __dirname + '/views');
	
	APP.use(favicon('./favicon.ico'));
	
	APP.use(bodyParser.urlencoded({ extended: false }));
	APP.use(bodyParser.json());
	APP.use(methodOverride());
	APP.use(express.static(path.join(__dirname, 'public')));

	//APP.use(express.logger('dev'));
	const ACCESS_LOG_STREAM = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'});
	APP.use(morgan('combined', {stream: ACCESS_LOG_STREAM}));

	// development only
	if ('development' === APP.get('env')) {
		APP.use(errorhandler())
	}
	
	APP.get('/', routes.index);
	APP.get('/rest/fib', fib.get);
	APP.get('/about', about.get);
	
	//console.log(CLUSTER.worker.process.pid);
	
	HTTP.createServer(APP).listen(APP.get('port'), function(){
	  console.log('Express server Worker '+CLUSTER.worker.process.pid+' listening on port ' + APP.get('port'));
	});

}
