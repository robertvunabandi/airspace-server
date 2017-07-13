var express = require('express');
var path = require('path');
// var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy; // for passwords

var mongoose = require('mongoose');
var mongoClient = require("mongodb").MongoClient;

// connect mongoClient to the right database
/* mongoClient.connect("mongodb://localhost:27017/RAWR", function (err, db) {
  db.close();
}); */

var promise = mongoose.connect("mongodb://localhost:27017/RAWR", {
	useMongoClient: true
});

// connect mongoose to that same database
// mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://localhost:27017/RAWR');

var connection = mongoose.connection;
connection.on("error", console.error.bind(console, 'connection error:'));
connection.on("connected", function(){
	console.log(`Mongoose connected to DB`);
});


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index); // for general requests
app.use('/usr', users); // for users data 

// catch 404 and forward to error handler
app.use(function(request, response, next) {
	// console.log(request);
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handler
app.use(function(err, request, response, next) {

	// set locals, only providing error in development
	response.locals.message = err.message;
	response.locals.error = request.app.get('env') === 'development' ? err : {};
	
	// error response could change based on this
	var errorResponse = {
		code: err.status || 500,
		error: "unknown error"
	};

	response.status(err.status || 500);
	response.setHeader('Content-Type', 'application/json');
	response.send(JSON.stringify(errorResponse));
});

module.exports = app;
