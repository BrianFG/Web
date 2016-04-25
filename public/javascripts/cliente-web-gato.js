/*
 Juego de Gato distribuido
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

//------------------------------------------------------------------------------
$(document).ready(function () {

  //----------------------------------------------------------------------------
  $('.regresar_al_menu').click(menuPrincipal);

  //----------------------------------------------------------------------------
  $('#boton_continuar_crear_juego').click(continuarCrearJuego);

  //----------------------------------------------------------------------------
  $('#boton_crear_juego').click(function () {
    $('div').hide();
    $('#nombre_del_juego').val('');
    $('#seccion_solicitar_nombre').show();
  });

  //----------------------------------------------------------------------------
  $('#boton_continuar_unir_juego').click(function () {
    var id_juego = $('#lista_juego').val();
    $.ajax({
      url: '/gato/unir_juego/',
      type: 'PUT',
      dataType: 'json',
      data: { id_juego: id_juego },
      error: errorConexion,
      success: function (resultado) {
        if (resultado.unido) {
          $('div').hide();
          $('#simbolo').html(resultado.simbolo);
          $('#boton_mensajes_regresar_al_menu').hide();
          $('#seccion_mensajes').show();
          $('#seccion_tablero').show();
          $('#mensaje_1').html('Por favor espera tu turno.');
          esperaTurno();
        }
      }
    });
  });

  //----------------------------------------------------------------------------
  $('#boton_unir_juego').click(function () {
    $('div').hide();
    $.ajax({
      url: '/gato/juegos_existentes/',
      type: 'GET',
      dataType: 'json',
      error: errorConexion,
      success: function (resultado) {
        if (resultado.length === 0) {
          $('#seccion_sin_juegos').show();
        } else {
          var r = resultado.map(function (x) {
            return '<option value="' + x.id + '">' +
              escaparHtml(x.nombre) + '</option>';
          });
          $('#lista_juego').html(r.join(''));
          $('#seccion_lista_juegos').show();
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
      if (tablero[i][j] === ' ') {
        $(c).addClass('seleccionable');
        tirable(c, i, j);
      }
    });
  }

  //----------------------------------------------------------------------------
  function actualizar(tablero) {
    recorreTablero(tablero, function () {});
  }

  //----------------------------------------------------------------------------
  function continuarCrearJuego() {

    var nombre = $('#nombre_del_juego').val().trim();

    if (nombre === '') {
      mensajeError('El nombre del juego no puede quedar vacío.');
    } else {
      $.ajax({
        url: '/gato/crear_juego/',
        type: 'POST',
        dataType: 'json',
        data: {
          nombre: nombre
        },
        error: errorConexion,
        success: function (resultado) {
          var texto;
          if (resultado.creado) {
            $('div').hide();
            $('#simbolo').html(resultado.simbolo);
            $('#mensaje_1').html('Esperando a que alguien más se una al ' +
              'juego <strong>' + escaparHtml(nombre) + '</strong>.');
            $('#boton_mensajes_regresar_al_menu').hide();
            $('#seccion_mensajes').show();
            $('#seccion_tablero').show();
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
      $(c).addClass('desactivo');
      $(c).unbind('click');
    });
  }

  //----------------------------------------------------------------------------
  function errorConexion() {
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
        url: '/gato/estado/',
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

          case 'empate':
            actualizar(resultado.tablero);
            finDeJuego('<strong>Empate.</strong>');
            break;

          case 'ganaste':
            finDeJuego('<strong>Ganaste.</strong> ¡Felicidades!');
            resalta(resultado.tablero);
            break;

          case 'perdiste':
            finDeJuego('<strong>Perdiste.</strong> ¡Lástima!');
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
  function finDeJuego(mensaje) {
    $('body').css('cursor', 'auto');
    $('#mensaje_1').html(mensaje);
    $('#mensaje_3').html('');
    $('#boton_mensajes_regresar_al_menu').show();
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
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        var c = '#c' + i + j;
        $(c).html(tablero[i][j]);
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
      $.ajax({
        url: '/gato/tirar/',
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

});
