const express = require('express');
const path = require('path');
// var favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const index = require('./routes/index');
const travel_notice = require('./routes/travel_notices');
const users = require('./routes/users');

const app = express();

const mongoose = require('mongoose');
const mongoClient = require("mongodb").MongoClient;

// connect mongoClient to the right database
/* mongoClient.connect("mongodb://localhost:27017/RAWR", function (err, db) {
 db.close();
 }); */

const DB_LOCAL_URL = "mongodb://localhost:27017/RAWR";
const DB_EXTERNAL_URL = `mongodb://rawr_db:rveIisZqYV@ds034807.mlab.com:34807/rawr_db`;
const DBS = [DB_EXTERNAL_URL, DB_LOCAL_URL];
// CONNECT IN SHELL: mongo ds034807.mlab.com:34807/rawr_db -u rawr_db -p rveIisZqYV

// 0:external:0, 1:local:1
let promise = mongoose.connect(DBS[0], {
    useMongoClient: true
});

// connect mongoose to that same database
// mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://localhost:27017/RAWR');

let connection = mongoose.connection;
connection.on("error", console.error.bind(console, 'connection error:'));
connection.on("connected", function () {
    console.log(`Mongoose connected to DB`);
});


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index); //
app.use('/travel_notice', travel_notice); //
app.use('/user', users); //

// catch 404 and forward to error handler
app.use(function (request, response, next) {
    // console.log(request);
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, request, response, next) {

    // set locals, only providing error in development
    response.locals.message = err.message;
    response.locals.error = request.app.get('env') === 'development' ? err : {};

    // error response could change based on this
    let errorResponse = {
        code: err.status || 500,
        error: err
    };

    response.status(err.status || 500);
    response.setHeader('Content-Type', 'application/json');
    response.send(JSON.stringify(errorResponse));
});

module.exports = app;
