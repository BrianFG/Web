/*******************************************************************************
 * Juego de Gato distribuido
 * Definición del modelo Juego.
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

var mongoose = require('mongoose');
var constantes = require('./constantes.js');

//-------------------------------------------------------------------------------
var esquemaJuego = mongoose.Schema({
  nombre:   String,
  iniciado: { type: Boolean,
              default: false },
  turno:    { type: String, default:
              constantes.SIMBOLO[0] },
  tablero:  String 
});

//-------------------------------------------------------------------------------
esquemaJuego.methods.getTablero = function () {
  return JSON.parse(this.tablero);
};

//-------------------------------------------------------------------------------
esquemaJuego.methods.setTablero = function (tablero) {
  this.tablero = JSON.stringify(tablero);
};

//-------------------------------------------------------------------------------
module.exports = mongoose.model('Juego', esquemaJuego);
