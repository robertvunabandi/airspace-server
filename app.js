var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();
var mongoose = require('mongoose');

/*
// mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://localhost/lexis')
var mongoClient = require("mongodb").MongoClient;
mongoClient.connect("mongodb://lexis:INT4AfwDVxtCpJvR8aTi9fzmdGTyR11ZXs3rm5TpzZe4tKecP8Ru3AfKmRC8l05DvziS0IlJMl3TQQTM7520Mw==@lexis.documents.azure.com:10250/?ssl=true", function (err, db) {
  db.close();
});
mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://lexis:INT4AfwDVxtCpJvR8aTi9fzmdGTyR11ZXs3rm5TpzZe4tKecP8Ru3AfKmRC8l05DvziS0IlJMl3TQQTM7520Mw==@lexis.documents.azure.com:10250/?ssl=true&sslverifycertificate=false');
	/*
	Example localhost: 'mongodb://localhost:27017/test';
	Example Azure URI: mongodb://aaronsmongodbrw:xSJEozk4Tmg74Q1iyXMN0sEgr0PfegnIrDz5xq8N5UvmwlsFSSqGR0QMAx1nw5hdiENdcSQbHHK7t4ZQY0wf6g==@aaron    smongodbrw.documents.azure.com:10250/<db_name>?ssl=true
	Example Heroku (MongoLab) URI: 'mongodb://<db_user>:<db_pass>@ds117919.mlab.com:17919/heroku_n54n38l8';
	* /
var hbs = require('hbs');
hbs.registerPartials(__dirname+"/views/partials");
var connection = mongoose.connection;
connection.on("error", console.error.bind(console, 'connection error:'));
connection.on("connected", function(){
	var message = chalk.bgBlue.red.bold.underline("DATABASE CONNECTED!");
	console.log(message);
});
*/

// view engine setup //@R
app.set('views', path.join(__dirname, 'views')); //@R
app.set('view engine', 'jade'); //@R


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index); // for general requests
app.use('/users', users); // for users data 

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handler
app.use(function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
	
	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;
