/**
 * Created by Diego Reyes on 1/7/14.
 */
var	config = require('./config/config.js'),
	dateTime = require('./include/moment'),
	express		=	require('express'),
	fs			=	require('fs'),
	LocalStrategy =	require('passport-local').Strategy,
	log4n		=	require('./include/log/log4node.js'),
	mail = require("./include/emailjs"),
	moment = require('moment'),
	mongoose	=	require('mongoose'),
	passport	=	require('passport'),
	path		=	require('path'),
	socketio = require('socket.io');

var server, port, protocol;
var app = express();

var logOptions = {
	path: config.log.path,
	filename: config.log.filename,
	toConsole: config.log.toConsole,
	toFile: config.log.toFile
};
var log = new log4n(logOptions);

var processArgs = process.argv.slice(2);

if (process.env.HTTP === 'https'){
	var https = require('https');

	port = config.server_ssl_port;
	protocol = 'https';

	var options = {
		key: fs.readFileSync('./certificates/puertobuenosaires.gob.ar.key'),
		cert: fs.readFileSync('./certificates/14452602.crt'),
		ca: [fs.readFileSync('./certificates/14452602.ca-bundle.crt')],
		// Ask for the client's cert
		requestCert: false,
		// Don't automatically reject
		rejectUnauthorized: false
	};
	server = https.createServer(options, app);
} else {
	var http = require('http');

	http.globalAgent.maxSockets = 100;

	port = config.server_port;
	protocol = 'http';

	server = http.createServer(app);
}
port = processArgs[0] || port;

app.configure(function () {

	app.set('views', __dirname + '/public');
	app.engine('.html', require('jade').__express);

	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);

//	app.use(passport.initialize());

});

app.all('/*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", 'X-Requested-With, Content-Type, token');
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
//	res.header('Access-Control-Request-Method', 'GET');
	res.header('Access-Control-Request-Headers', 'Content-Type, token');

	res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
	res.header('Expires', '-1');
	res.header('Pragma', 'no-cache');


	if ('OPTIONS' == req.method) {
		res.send(200);
	}
	else {
		next();
	}
//	next();
});

var Account = require(__dirname +'/models/account');
passport.use(Account.createStrategy());


app.get('/', function(req, res) {

	var connected = false;
	if (mongoose.connections.length>0)
		if (mongoose.connections[0]._hasOpened)
			connected = true;

	var params = {
		server	: process.env.NODE_ENV,
		node	: {version:process.version, runtime: server.runtime},
		mongoose: {version:mongoose.version, connected:connected},
		pid		: process.pid
	}
	res.render('index.jade', params, function(err, html) {
		res.send(200, html);
	});

});

app.get('/log', function(req, res) {

	var filename = 'log/nohup.out';
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.write('<html><body>');
	res.write('<br/><center><p><a name="top" style="font-size: 22px" href="#bottom">Ir a fin de pagina</a></p></center>');

	fs.exists(filename, function(exists){
		if (exists) {
			// serve file
			var lazy = require("lazy")
			new lazy(fs.createReadStream(filename))
				.lines
				.forEach(function(line){
					var n = line.toString().toUpperCase().indexOf("ERROR");
					if (n > 0)
						res.write("<div style='color:red'>"+ line.toString()+"</div>");
					else
						res.write(line.toString()+"<br/>");

				}
			).on('pipe', function(){
					res.write('<center><p><a name="bottom" style="font-size: 22px" href="#top">Ir a inicio de pagina</a></p></center>');
					res.write('</body></html>');
					res.end();
			});
		} else {
			res.write("<h1>No se encuentra Log</h1>");
			res.write('</body></html>');
			res.end();
		}
	});
});

var files=[];
app.get('/log2', function(req, res) {

	if (req.query.filename === undefined){
		log.getFiles(function (files){
			var params = {
				moment: moment,
				json:[],
				files: files
			};
			res.render('log.jade', params, function(err, html) {
				res.send(200, html);
			});
		});
	} else {
		fs.exists(req.query.filename, function(exists){
			if (exists) {
				var params = {
					moment: moment,
					json:[],
					filename:req.query.filename,
					files:files
				};
				// serve file
				var lazy = require("lazy")
				new lazy(fs.createReadStream(req.query.filename))
					.lines
					.forEach(function(line){
						params.json.push(JSON.parse(line.toString()));
					}
				).on('pipe', function(){
						params.json.reverse();
						res.render('log.jade', params, function(err, html) {
							res.send(200, html);
						});
					});
			} else {
				res.end();
			}
		});
	}


});

server.listen(port, function() {
	server.runtime = dateTime.getDatetime();
	log.logger.info("Nodejs server Version: %s", process.version);
	log.logger.info("Running on %s://localhost:%s", protocol, port);
	log.logger.info("Process Id (pid): %s", process.pid);
});

var io = socketio.listen(server);
io.set('log level', 1);
io.on('connection', function (socket){
	log.logger.info('Socket Client Connected: %s.', socket.id);

	socket.on('newUser', function (cb){
		cb(socket.id);
	});

});

//routes = require('./routes/accounts')(app, passport);
require('./routes/accounts')(app, null, log);
require('./routes/invoice')(app, io, log);
require('./routes/comment')(app, io, log);
require('./routes/price')(app, log);
require('./routes/matchPrice')(app, log);
require('./routes/appointment')(app, io, log);
require('./routes/gate')(app, io, log);
require('./routes/voucherType')(app);
require('./routes/docType')(app);
require('./routes/unitType')(app);
require('./routes/state')(app);


var genericPool = require('generic-pool');
var oracle = require('oracle');

var pool = genericPool.Pool({
	name: 'testpool 0',
	log: true,
	max: 10,
	create: function(callback) {
		var settings = {
			hostname: config.oracle.hostname,
			port: config.oracle.port,
			database: config.oracle.database,
			user: config.oracle.user,
			password: config.oracle.password
		}
		new oracle.connect(settings, function(err, connection) {
			callback(err, connection);
		});
	},
	destroy: function(connection) {
		connection.close();
	}
});


require('./routes/oracle/registro1_sumImpoMani')(app, log, pool);
require('./routes/oracle/registro2_sumImpoMani')(app, log, pool);
require('./routes/oracle/registro3_sumImpoMani')(app, log, pool);
require('./routes/oracle/registro4_sumImpoMani')(app, log, pool);
require('./routes/oracle/registro1_sumExpoMane')(app, log, pool);
require('./routes/oracle/registro2_sumExpoMane')(app, log, pool);
require('./routes/oracle/registro3_sumExpoMane')(app, log, pool);
require('./routes/oracle/registro4_sumExpoMane')(app, log, pool);
require('./routes/oracle/registro5_sumExpoMane')(app, log, pool);
require('./routes/oracle/registro1_solicitud')(app, log, pool);
require('./routes/oracle/registro2_solicitud')(app, log, pool);
require('./routes/oracle/registro3_solicitud')(app, log, pool);
require('./routes/oracle/registro1_afectacion')(app, log, pool);
require('./routes/oracle/registro2_afectacion')(app, log, pool);
require('./routes/oracle/registro1_detImpo')(app, log, pool);
require('./routes/oracle/registro2_detImpo')(app, log, pool);
require('./routes/oracle/registro3_detImpo')(app, log, pool);
require('./routes/oracle/registro1_detExpo')(app, log, pool);
require('./routes/oracle/registro2_detExpo')(app, log, pool);
require('./routes/oracle/registro3_detExpo')(app, log, pool);

require('./routes/oracle/test')(app, log);



//	Database configuration
mongoose.connect(config.mongo_url, config.mongo_opts);

mongoose.connection.on('connected', function () {
	log.logger.info("Mongoose version: %s", mongoose.version);
	log.logger.info("Connected to Database. %s",config.mongo_url);
});
mongoose.connection.on('error',function (err) {
	log.logger.error("Database or Mongoose error. %s", err.toString());
});
mongoose.connection.on('disconnected', function () {
	log.logger.error("Mongoose default connection disconnected");
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function() {
	mongoose.connection.close(function () {
		log.logger.info("Mongoose default connection disconnected through app termination");
		log.logger.info("process.env.NODE_ENV %s", process.env.NODE_ENV);
		if (process.env.NODE_ENV === 'production'){
			var mailer = new mail.mail(config.email);
			mailer.send('noreply@puertobuenosaires.gob.ar', 'AGP-TERAPI - ERROR', 'Mongoose default connection disconnected', function() {
				process.exit(0);
			});
		} else {
			process.exit(0);
		}
	});
});

process.on('uncaughtException', function(err) {
	log.logger.info("Caught exception: " + err);
});