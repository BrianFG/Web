/*******************************************************************************
 * Juego de Gato distribuido
 * Servidor web.
 * Copyright (C) 2013-2016 por Ariel Ortiz
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 ******************************************************************************/

'use strict';

var express        = require('express');
var path           = require('path');
var favicon        = require('serve-favicon');
var logger         = require('morgan');
var cookieParser   = require('cookie-parser');
var bodyParser     = require('body-parser');

// Módulos adicionales para la aplicación.
var cookieSession  = require('cookie-session');
var mongoose       = require('mongoose');
var juego          = require('./package.json');
var routes         = require('./routes/caballos');


var app = express();

// Añadir soporte para manejo de sesiones.
app.use(cookieSession({ secret: 'Una cadena secreta.' }));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(__dirname + '/public/images/sonrisa.png'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;

// Título y créditos de la aplicación.
console.log(juego.description + ", versión " + juego.version);
console.log(juego.author);

console.log();
console.log('Este programa es software libre: usted puede redistribuirlo y/o');
console.log('modificarlo bajo los términos de la Licencia Pública General GNU');
console.log('versión 3 o posterior.');
console.log('Este programa se distribuye sin garantía alguna.');
console.log();

// Conexión a base de datos MongoDB.
mongoose.connect('mongodb://localhost/gato');
mongoose.connection.on('open', () => {
  console.log('Conectado a MongoDB');
});
mongoose.connection.on('error', err => {
  console.log('Error de Mongoose. ' + err);
});
