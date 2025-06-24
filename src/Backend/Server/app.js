var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');

var usersRouter = require('./routes/users');
var dogodkiRouter = require('./routes/dogodki');
var komentarjiRouter = require('./routes/komentarji');
var oceneRouter = require('./routes/ocene');
var prijavaRouter = require('./routes/prijava');
var emailRouter = require('./routes/email');
var statisticsRouter = require('./routes/statistics');

var app = express();

// const allowedOrigins = [
//     'http://localhost:5500',
//     'http://127.0.0.1:5500'
//   ];
  
  // app.use(cors({
  //   origin: function (origin, callback) {
  //     if (!origin) return callback(null, true);
      
  //     if (allowedOrigins.indexOf(origin) !== -1) {
  //       callback(null, true);
  //     } else {
  //       callback(new Error('Not allowed by CORS'));
  //     }
  //   },
  //   methods: ['GET', 'POST', 'PUT', 'DELETE'],
  //   allowedHeaders: ['Content-Type', 'Authorization'],
  //   credentials: true
  // }));
app.use(cors());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/Images', express.static(path.join(__dirname, 'Images')));

app.use('/users', usersRouter);
app.use('/dogodki', dogodkiRouter);
app.use('/komentarji', komentarjiRouter);
app.use('/ocene', oceneRouter);
app.use('/prijava', prijavaRouter);
app.use('/email', emailRouter);
app.use('/statistics', statisticsRouter);

console.log("Server is running on port 3000");

module.exports = app;
