/*
 Juego de Caballos distribuido
 Cliente web.
 Copyright (C) 2013-2016 por Ariel Ortiz

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/* global $ */

'use strict';

const PAUSA = 1000;  // Número de milisegundos entre cada petición de espera
var simbolo;
var tablero2;
var indices_actuales;
//------------------------------------------------------------------------------
$(document).ready(function () {
  $('#nuevo-juego').addClass('hidden');

  //----------------------------------------------------------------------------
  $('.regresar_al_menu').click(menuPrincipal);

  //----------------------------------------------------------------------------
  $('#crear-juego').click(continuarCrearJuego);

  //----------------------------------------------------------------------------
  $('#creacion-juego').click(function () {
    $('#nuevo-juego').removeClass('hidden');
  });

  //----------------------------------------------------------------------------
  $('#unir-juego').click(function () {
    var id_juego = $('#lista-juegos').val();
    $.ajax({
      url: '/caballos/unir_juego/',
      type: 'PUT',
      dataType: 'json',
      data: { id_juego: id_juego },
      error: errorConexion,
      success: function (resultado) {
        if (resultado.unido) {
          simbolo = resultado.simbolo;
          dibujarTablero(resultado.tablero);
          esperaTurno();
        }
      }
    });
  });

  //----------------------------------------------------------------------------
  $('#union-juego').click(function () {

    $.ajax({
      url: '/caballos/juegos_existentes/',
      type: 'GET',
      dataType: 'json',
      error: errorConexion,
      success: function (resultado) {
        if (resultado.length === 0) {
            //mensaje no juegos
        } else {
          var lista = $('#lista-juegos');
              $.each(resultado, function (i, x) {
            lista.append($('<option>', { 
              value: x.id,
              text : x.nombre
              }));
          });

          $(".selectpicker").selectpicker('refresh');
        }
      }
    });
  });

  //----------------------------------------------------------------------------
  $('#form_lista_juegos').submit(function () {
    return false; // Se requiere para evitar que la forma haga un "submit".
  });

  //----------------------------------------------------------------------------
  $('#form_nombre_del_juego').submit(continuarCrearJuego);

  //----------------------------------------------------------------------------
  function activar(tablero) {
    recorreTablero(tablero, function (c, i, j) {
      $(c).removeClass('desactivo');
      $(c).addClass('activo');
      if (tiroValido(tablero, i,  j, simbolo)) {
        $(c).addClass('seleccionable');
        $(c).css("background-color", "#F5D76E");
        $(c).addClass("hvr-bounce-in");
        tirable(c, i, j);
      }else{
        var color ;
        if ( (i+j)%2 === 0){
          color = "#1E824C";
        }else{
          color = "#A2DED0";
        }
        $(c).css("background-color", color);
        $(c).removeClass("hvr-bounce-in");
      }
    });
  }

  //----------------------------------------------------------------------------
  function actualizar(tablero) {
    recorreTablero(tablero, function () {});
  }

  //----------------------------------------------------------------------------
  function continuarCrearJuego() {

    var nombre = $('#nombre-juego').val().trim();
    alert(nombre);

    if (nombre === '') {
      mensajeError('El nombre del juego no puede quedar vacío.');
    } else {
      $.ajax({
        url: '/caballos/crear_juego/',
        type: 'POST',
        dataType: 'json',
        data: {
          nombre: nombre
        },
        error: errorConexion,
        success: function (resultado) {
          var texto;
          if (resultado.creado) {
            simbolo = resultado.simbolo;
            simbolo = resultado.simbolo;
            dibujarTablero(resultado.tablero);
            tablero2 = resultado.tablero;
            esperaTurno();
          } else {
            switch (resultado.codigo) {

            case 'duplicado':
              texto = 'Alguien más ya creó un juego con este ' +
                'nombre: <em>' + escaparHtml(nombre) + '</em>';
              break;

            case 'invalido':
              texto = 'No se proporcionó un nombre de juego válido.';
              break;

            default:
              texto = 'Error desconocido.';
              break;
            }
            mensajeError(texto);
          }
        }
      });
    }
    return false; // Se requiere para evitar que la forma haga un "submit".
  }

  //----------------------------------------------------------------------------
  function desactivar(tablero) {
    recorreTablero(tablero, function (c, i, j) {
      $(c).removeClass('activo');
      $(c).removeClass('seleccionable');
      var color ;
      if ( (i+j)%2 === 0){
        color = "#1E824C";
      }else{
        color = "#A2DED0";
      }
      $(c).addClass('desactivo');
      $(c).unbind('click');
      $(c).css("background-color", color);
        $(c).removeClass("hvr-bounce-in");
    });
  }

  //----------------------------------------------------------------------------
  function errorConexion() {
    alert("no pudo");
    mensajeError('No es posible conectarse al servidor.');
  }

  //----------------------------------------------------------------------------
  // Para evitar inyecciones de HTML.
  function escaparHtml (str) {
    return $('<div/>').text(str).html();
  }

  //----------------------------------------------------------------------------
  function esperaTurno() {

    var segundos = 0;

    $('body').css('cursor', 'wait');

    function ticToc() {
      $('#mensaje_3').html('Llevas ' + segundos + ' segundo' +
        (segundos === 1 ? '' : 's') + ' esperando.');
      segundos++;
      $.ajax({
        url: '/caballos/estado/',
        type: 'GET',
        dataType: 'json',
        error: errorConexion,
        success: function (resultado) {

          switch (resultado.estado) {

          case 'tu_turno':
            turnoTirar(resultado.tablero);
            break;

          case 'espera':
            setTimeout(ticToc, PAUSA);
            break;

          case 'ganaste':
            finDeJuego('<strong>Ganaste.</strong> ¡Felicidades!' , "success");
            resalta(resultado.tablero);
            break;

          case 'perdiste':
            finDeJuego('<strong>Perdiste.</strong> ¡Lástima!' , "danger");
            actualizar(resultado.tablero);
            resalta(resultado.tablero);
            break;
          }
        }
      });
    }
    setTimeout(ticToc, 0);
  }

  //----------------------------------------------------------------------------
  function finDeJuego(mensaje, tipo) {
    $('body').css('cursor', 'auto');
    var alerta = $('<div>', {class: 'alert alert-' + tipo});
    alerta.html(mensaje);
    $('#mensaje-juego').html(alerta);
  }

  //----------------------------------------------------------------------------
  function mensajeError(mensaje) {
    $('body').css('cursor', 'auto');
    $('div').hide();
    $('#mensaje_error').html(mensaje);
    $('#seccion_error').show();
  }

  //----------------------------------------------------------------------------
  function menuPrincipal() {
    reiniciaTablero();
    $('div').hide();
    $('#seccion_menu').show();
    return false;
  }

  //----------------------------------------------------------------------------
  function recorreTablero(tablero, f) {
    for (var i = 0; i < tablero.length; i++) {
      for (var j = 0; j < tablero[0].length; j++) {
        var c = '#c' + i + j;
        var glyph = icono(tablero[i][j]);
        $(c).html(glyph);
        f(c, i, j);
      }
    }
  }

  //----------------------------------------------------------------------------
  function reiniciaTablero() {
    var tablero = [[' ', ' ', ' '],[' ', ' ', ' '],[' ', ' ', ' ']];
    recorreTablero(tablero, function (c, i, j) {
      $(c).removeClass();
      $(c).addClass('desactivo');
    });
  }

  //----------------------------------------------------------------------------
  function resalta(t) {

    function revisa(a, b, c) {
      if (t[a[0]][a[1]] === t[b[0]][b[1]] &&
          t[b[0]][b[1]] === t[c[0]][c[1]] &&
          t[a[0]][a[1]] !== ' ') {
        $('#c' + a[0] + a[1]).removeClass().addClass('ganador');
        $('#c' + b[0] + b[1]).removeClass().addClass('ganador');
        $('#c' + c[0] + c[1]).removeClass().addClass('ganador');
      }
    }

    revisa([0,0],[0,1],[0,2]);
    revisa([1,0],[1,1],[1,2]);
    revisa([2,0],[2,1],[2,2]);
    revisa([0,0],[1,0],[2,0]);
    revisa([0,1],[1,1],[2,1]);
    revisa([0,2],[1,2],[2,2]);
    revisa([0,0],[1,1],[2,2]);
    revisa([0,2],[1,1],[2,0]);
  }

  //----------------------------------------------------------------------------
  function tirable(nombre, ren, col) {
    $(nombre).click(function () {
      alert("tirar en " + ren + " , " + col);
      $.ajax({
        url: '/caballos/tirar/',
        type: 'PUT',
        dataType: 'json',
        data: {ren: ren, col: col},
        error: errorConexion,
        success: function (data) {
          if (data.efectuado) {

            desactivar(data.tablero);
            $('#mensaje_1').html('Por favor espera tu turno.');
            esperaTurno();
          }
        }
      });
    });
  }

  //----------------------------------------------------------------------------





  function turnoTirar(tablero) {
    $('body').css('cursor', 'auto');
    $('#mensaje_1').html('Es tu turno.');
    $('#mensaje_3').html('');
    activar(tablero);
  }

  function icono (simbolo){
    var glyph = $('<i>');
    switch(simbolo) {
      case "H":
          glyph = $('<i>', {class : "glyphicon glyphicon-knight"}).css("color" , "#FFF");
          break;
      case "h":
          glyph = $('<i>', {class : "glyphicon glyphicon-knight"}).css("color" , "#000");
          break;
      case "K":
          glyph = $('<i>', {class : "glyphicon glyphicon-king"}).css("color" , "#FFF");
          break;
      case "k":
          glyph = $('<i>', {class : "glyphicon glyphicon-king"}).css("color" , "#000");
          break;
      }
      return glyph;
  }

  function dibujarTablero(tablero){
  var table = $('<table>');
  for (var i = 0; i < tablero.length; i++){
    var tr = $('<tr>');
    for (var j = 0; j < tablero[0].length; j++){
      var glyph = icono(tablero[i][j]);
      var color ;
      if ( (i+j)%2 === 0){
        color = "#1E824C";
      }else{
        color = "#A2DED0";
      }
      tr.append($('<td>' , { id: 'c' + i + j, class: 'desactivo' }).css("background-color" , color).append(glyph));
      
    }

    table.append(tr);
  }
    $('#tablero').html(table);

  }

  function indice_tiro (tablero, simbolo){
    for (var i = 0 ; i < tablero.length ; i++){
      for (var j = 0 ; j < tablero[0].length ; j++){
        if (tablero[i][j] === simbolo){
          return [i, j];
        } 
      }
    }
    return [-1, -1];
  }

  function tiros_posibles (ren, col, tablero){
      var n = tablero.length;
      var m = tablero[0].length;
      var tiros = [];
      if ( (ren + 2) < n){
        if ( (col + 1) <  m) tiros.push([ren+2, col+1]);
        if ( (col - 1) >= 0) tiros.push([ren+2, col-1]);
      }
      if ( (ren - 2) >= 0){
        if ( (col + 1) <  m) tiros.push([ren-2, col+1]);
        if ( (col - 1) >= 0) tiros.push([ren-2, col-1]);
      }
      if ( (ren + 1) < n){
        if ( (col + 2) <  m) tiros.push([ren+1, col+2]);
        if ( (col - 2) >= 0) tiros.push([ren+1, col-2]);
      }
      if ( (ren - 1) >= 0){
        if ( (col + 2) <  m) tiros.push([ren-1, col+2]);
        if ( (col - 2) >= 0) tiros.push([ren-1, col-2]);
      }
      return tiros;
    }

    function tiroValido(tablero, ren, col, simbolo) {
      var rey ;
      if (simbolo === "H"){
        rey = "K";
      }else{
        rey = "k";
      }
      var indices = indice_tiro(tablero, simbolo);
      indices_actuales = indices;
      var tiros = tiros_posibles(indices[0], indices[1], tablero);

      if ( !contiene_tiro(tiros, [ren, col])){

        return false;
      }
      if( tablero[ren][col] === rey){

        return false;
      } 
      return true;
    }

        function contiene_tiro(arr, tiro) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i][0] === tiro[0] && arr[i][1] === tiro[1]) {
            console.log("Si esta");
            return true;
        }
      }
      return false;
    }


});
