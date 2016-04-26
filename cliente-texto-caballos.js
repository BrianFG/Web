

'use strict';

//------------------------------------------------------------------------------
const querystring   = require('querystring');
const request       = require('request');

//------------------------------------------------------------------------------
const stdin         = process.stdin;
const stdout        = process.stdout;
var servicioWeb;
const PAUSA       = 1000;          // Milisegundos entre cada petición de espera

//------------------------------------------------------------------------------
// Creador de objetos para invocar servicios web.

function invocadorServicioWeb(host) {

  let cookiesSesion = null;

  //----------------------------------------------------------------------------
  function obtenerCookies(res) {

    let valorSetCookies = res.headers['set-cookie'];

    if (valorSetCookies) {
      let cookies = [];
      valorSetCookies.forEach(str => cookies.push(/([^=]+=[^;]+);/.exec(str)[1]));
      cookiesSesion = cookies.join('; ');
    }
  }

  //----------------------------------------------------------------------------
  function encabezados(metodo) {
    let r = {};
    if (metodo !== 'GET') {
      r['Content-type'] = 'application/x-www-form-urlencoded';
    }
    if (cookiesSesion) {
      r['Cookie'] = cookiesSesion;
    }
    return r;
  }

  return {

    //--------------------------------------------------------------------------
    invocar: (metodo, ruta, params, callback) => {

      let opciones = {
        url: host + ruta,
        method: metodo,
        headers: encabezados(metodo)
      };
      let qs = querystring.stringify(params);
      if (metodo === 'GET' && qs !== '') {
        opciones.url +=  '?' + qs;
      } else {
        opciones.body = qs;
      }

      request(opciones, (error, res, body) => {
        if (res.statusCode !== 200) {
          errorFatal('Not OK status code (' + res.statusCode + ')');
        }
        obtenerCookies(res);
        callback(JSON.parse(body));
      });
    }
  };
}

//------------------------------------------------------------------------------
function crearJuego() {

  imprimirNl();
  imprimir('Indica el nombre del juego: ');

  stdin.once('data', data => {

    let name = data.toString().trim();

    if (name === '') {
      menu();

    } else {
      servicioWeb.invocar(
        'POST',
        '/caballos/crear_juego/',
        {'nombre': name},
        resultado => {

          if (resultado.creado) {
            jugar(resultado.simbolo);
            return;

          } else if (resultado.codigo === 'duplicado') {
            imprimirNl();
            imprimirNl('Error: Alguien más ya creó un juego con este ' +
                      'nombre: ' + name);

          } else {
            imprimirNl();
            imprimirNl('No se proporcionó un nombre de juego válido.');
          }

          menu();
        }
      );
    }
  });
}

//------------------------------------------------------------------------------
function errorFatal(mensaje) {
  imprimirNl('ERROR FATAL: ' + mensaje);
  process.exit(1);
}

//------------------------------------------------------------------------------
function esperarTurno(callback) {
  servicioWeb.invocar(
    'GET',
    '/caballos/estado/',
    {},
    resultado => {
      if (resultado.estado === 'espera') {
        setTimeout(() => esperarTurno(callback), PAUSA);
      } else {
        imprimirNl();
        callback(resultado);
      }
    }
  );
}

//------------------------------------------------------------------------------
function imprimir(mens) {
  if (mens !== undefined) {
    stdout.write(mens);
  }
}

//-------------------------------------------------------------------------------
function imprimirMenu() {
  imprimirNl();
  imprimirNl('================');
  imprimirNl(' MENÚ PRINCIPAL');
  imprimirNl('================');
  imprimirNl('(1) Crear un nuevo juego');
  imprimirNl('(2) Unirse a un juego existente');
  imprimirNl('(3) Salir');
  imprimirNl();
}

//------------------------------------------------------------------------------
function imprimirNl(mens) {
  if (mens !== undefined) {
    stdout.write(mens);
  }
  stdout.write('\n');
}

//------------------------------------------------------------------------------
function crearPosiblesTiros(tablero, i, j){
  var count = 0;
  var pos = [];
  if(i-1 >= 0 && j+2 < tablero[0].length){
    tablero[i-1][j+2] = count++;
    pos.push([i-1,j+2]);
  } 
  if(i-2 >= 0 && j+1 < tablero[0].length){
    tablero[i-2][j+1] = count++;
    pos.push([i-2,j+1]);
  } 
  if(i-2 >= 0 && j-1 >= 0){
    tablero[i-2][j-1] = count++;
    pos.push([i-2,j-1])
  } 
  if(i-1 >= 0 && j-2 >= 0){
    tablero[i-1][j-2] = count++;
    pos.push([i-1,j-2]);
  } 
  if(i+1 < tablero.length && j-2 >= 0){
    tablero[i+1][j-2] = count++;
    pos.push([i+1,j-2]);
  } 
  if(i+2 < tablero.length && j-1 >= 0){ 
    tablero[i+2][j-1] = count++; 
    pos.push([i+2,j-1]);
  }
  if(i+2 < tablero.length && j+1 < tablero[0].length){
    tablero[i+2][j+1] = count++;
    pos.push([i+2,j+1]);
  } 
  if(i+1 < tablero.length && j+2 < tablero[0].length){
    tablero[i+1][j+2] = count++;
    pos.push([i+1,j+2]);
  } 
  return pos;
}

function imprimirPosicionesTablero(tablero, simbolo) {
  var tabTmp = tablero.slice(0)
  var i;
  var j;
  for(i = 0; i < tabTmp.length; i++){
    j = tabTmp[i].indexOf(simbolo);
    if(j !== -1) break;
  }
  var pos = [[i,j],crearPosiblesTiros(tabTmp, i, j)];
  imprimirTablero(tabTmp);
  imprimirNl();
  return pos;
}

//------------------------------------------------------------------------------
function imprimirTablero(t) {
  var sep = Array()
  for(var i = 0; i < t[0].length; i++){
    sep.push('---')
  }
  var str = sep.join('|');
  for(var i = 0; i < t.length; i++){
    imprimirNl(' ' + t[i].join(' | '));
    if(i < t.length-1) imprimirNl(str)
  }
}

//------------------------------------------------------------------------------
function juegoTerminado(estado) {

  function mens(s) {
    imprimirNl();
    imprimirNl(s);
    return true;
  }

  switch (estado) {

  case 'empate':
    return mens('Empate.');

  case 'ganaste':
    return mens('Ganaste. ¡Felicidades!');

  case 'perdiste':
    return mens('Perdiste. ¡Lástima!');

  default:
    return false;
  }
}

//------------------------------------------------------------------------------
function jugar(symbol) {

  imprimirNl();
  imprimirNl('Un momento');
  esperarTurno(resultado => {

    //--------------------------------------------------------------------------
    function tiroEfectuado(tablero) {
      imprimirNl();
      imprimirTablero(tablero);
      servicioWeb.invocar(
        'GET',
        '/caballos/estado/',
        {},
        resultado => {
          if (juegoTerminado(resultado.estado)) {
            menu();
          } else {
            jugar(symbol);
          }
        }
      );
    }

    //--------------------------------------------------------------------------
    function tiroNoEfectuado() {
      imprimirNl();
      imprimirNl('ERROR: Tiro inválido.');
      jugar(symbol);
    }
    //--------------------------------------------------------------------------
    
    imprimirTablero(resultado.tablero);

    if (juegoTerminado(resultado.estado)) {
      menu();

    } else if (resultado.estado === 'tu_turno') {
      imprimirNl();
      imprimirNl('Tú tiras con: ' + symbol);
      imprimirNl();
      var pos = imprimirPosicionesTablero(resultado.tablero, symbol);
      leerNumero(0, pos[1].length-1, opcion => {
        servicioWeb.invocar(
          'PUT',
          '/caballos/tirar/',
          { ren: pos[1][opcion][0], col: pos[1][opcion][1], pren: pos[0][0], pcol: pos[0][1]  },
          resultado => {
            if (resultado.efectuado) {
              tiroEfectuado(resultado.tablero);
            } else {
              tiroNoEfectuado();
            }
          }
        );
      });
    }
  });
}

//------------------------------------------------------------------------------
function leerNumero(inicio, fin, callback) {

  imprimir('Selecciona una opción del ' + inicio + ' al ' + fin + ': ');

  stdin.once('data', data => {

    let numeroValido = false;
    let num;

    data = data.toString().trim();

    if (/^\d+$/.test(data)) {
      num = parseInt(data);
      if (inicio <= num && num <= fin) {
        numeroValido = true;
      }
    }
    if (numeroValido) {
      callback(num);
    } else {
      leerNumero(inicio, fin, callback);
    }
  });
}

//------------------------------------------------------------------------------
function licencia() {
  console.log('Este programa es software libre: usted puede redistribuirlo y/o');
  console.log('modificarlo bajo los términos de la Licencia Pública General GNU');
  console.log('versión 3 o posterior.');
  console.log('Este programa se distribuye sin garantía alguna.');
}

//------------------------------------------------------------------------------
function menu() {
  imprimirMenu();
  leerNumero(1, 3, opcion => {
    switch (opcion) {

    case 1:
      crearJuego();
      break;

    case 2:
      unirJuego();
      break;

    case 3:
      process.exit(0);
    }});
}

//------------------------------------------------------------------------------
function seleccionarJuegosDisponibles(juegos, callback) {

  let total = juegos.length + 1;

  imprimirNl();
  imprimirNl('¿A qué juego deseas unirte?');
  for (let i = 1; i < total; i++) {
    imprimirNl('    (' + i + ') «' + juegos[i - 1].nombre + '»');
  }
  imprimirNl('    (' + total + ') Regresar al menú principal');
  leerNumero(1, total, opcion => callback(opcion === total ? -1 : opcion - 1));
}

//------------------------------------------------------------------------------
function titulo() {
  imprimirNl('Juego de caballos distribuido');
  imprimirNl('© 2013-2016 por Ariel Ortiz, ITESM CEM.');
}

//------------------------------------------------------------------------------
function unirJuego() {

  //----------------------------------------------------------------------------
  function verificarUnion(resultado) {
    if (resultado.unido) {
      jugar(resultado.simbolo);
    } else {
      imprimirNl();
      imprimirNl('No es posible unirse a ese juego.');
      menu();
    }
  }
  //----------------------------------------------------------------------------

  servicioWeb.invocar(
    'GET',
    '/caballos/juegos_existentes/',
    {},
    juegos => {
      if (juegos.length === 0) {
        imprimirNl();
        imprimirNl('No hay juegos disponibles.');
        menu();
      } else {
        seleccionarJuegosDisponibles(juegos, opcion => {
          if (opcion === -1) {
            menu();
          } else {
            servicioWeb.invocar(
              'PUT',
              '/caballos/unir_juego/',
              { id_juego: juegos[opcion].id },
              verificarUnion
            );
          }
        });
      }
    }
  );
}

//------------------------------------------------------------------------------

titulo();
imprimirNl();
licencia();

if (process.argv.length !== 3) {
  imprimirNl();
  imprimirNl('Se debe indicar: http://<nombre de host>:<puerto>');
  process.exit(0);

} else {
  servicioWeb = invocadorServicioWeb(process.argv[2]);
  menu();
}
