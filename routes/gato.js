

'use strict';

//------------------------------------------------------------------------------
const express    = require('express');
const router     = express.Router();
const constantes = require('../models/constantes.js');
const Juego      = require('../models/juego.js');
const Jugador    = require('../models/jugador.js');

module.exports = router;

//------------------------------------------------------------------------------

const ABORTAR  = true;

//------------------------------------------------------------------------------
// Convierte una función asíncrona en una promesa de ES6.
//------------------------------------------------------------------------------
function promisify(fun) {
  return function (/* ... */) {
    return new Promise((resolve, reject) => {
      let args = Array.prototype.slice.call(arguments);
      args.push((err, ...result) => {
        if (err) reject(err);
        else resolve(result);
      });
      fun.apply(null, args);
    });
  };
}

//------------------------------------------------------------------------------
router.get('/', (req, res) => {
  res.redirect('/caballos/');
});

//------------------------------------------------------------------------------
router.get('/caballos/', (req, res) => {
  res.render('index.ejs');
});

//------------------------------------------------------------------------------


function make_randoms (x){
  var ran1 = Math.floor(Math.random() * 4); 
  var ran2 ;
  do {
      ran2 = Math.floor(Math.random() * 4);
  } while(ran1 === ran2);

  return [ran1 , ran2];

}

  function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
  }


function make_board (n, m){
  var board = [];
  for(var i=0; i<n; i++) {
    board[i] = new Array(m);
    for (var j = 0; j < m ; j++){
      board[i][j] = " ";
    }
  }
  var randoms = make_randoms(m);
  board[0][randoms[0]] = constantes.SIMBOLO[0]
  board[0][randoms[1]] = constantes.SIMBOLO[1]
  randoms = make_randoms(m);
  board[n-1][randoms[0]] = constantes.SIMBOLO2[0]
  board[n-1][randoms[1]] = constantes.SIMBOLO2[1]
  return board;
}


router.post('/caballos/crear_juego/', (req, res) => {
  console.log()
  let resultado = { creado: false, codigo: 'invalido' };
  let nombre = req.body.nombre;
  var n = Math.floor(getRandomArbitrary(4,10));
  var m = Math.floor(getRandomArbitrary(4,10));
  let juego;
  let jugador;

  if (nombre) {
    let find = promisify(Juego.find.bind(Juego));
    find({ nombre: nombre, iniciado: false })
    .then(arg => {
      let juegos = arg[0];
      if (juegos.length === 0) {
        var tablero = JSON.stringify(make_board(n,m));

        juego = new Juego({nombre: nombre, tablero: tablero });
        resultado.tablero = juego.getTablero();
        let save = promisify(juego.save.bind(juego));
        return save();
      } else {
        resultado.codigo = 'duplicado';
        throw ABORTAR;
      }
    })
    .then(_ => {
      jugador = new Jugador({
        juego: juego._id,
        simbolo: constantes.SIMBOLO[0]
      });
      let save = promisify(jugador.save.bind(juego));
      return save();
    })
    .then(_ => {
      req.session.id_jugador = jugador._id;
      resultado.creado = true;
      resultado.codigo = 'bien';
      resultado.simbolo = jugador.simbolo;
    })
    .catch(err => {
      if (err !== ABORTAR) {
        console.log(err);
      }
    })
    .then(_ => res.json(resultado));
  }
});

//------------------------------------------------------------------------------
router.get('/caballos/estado/', (req, res) => {

  let resultado = { estado: 'error'};

  obtenerJuegoJugador(req, (err, juego, jugador) => {

    //--------------------------------------------------------------------------
    function eliminarJuegoJugadores () {
      let remove = promisify(jugador.remove.bind(jugador));
      delete req.session.id_jugador;
      remove()
      .then(_ => {
        let find = promisify(Jugador.find.bind(Jugador));
        return find({ juego: juego._id });
      })
      .then(arg => {
        let jugadores = arg[0];
        if (jugadores.length === 0) {
          let remove = promisify(juego.remove.bind(juego));
          return remove();
        }
      })
      .catch(err => console.log(err))
      .then(_ => res.json(resultado));
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


    //--------------------------------------------------------------------------
    function ganado(s, t) {
      var contra = contrincante(s);
      var rey_contra = contrincante2(s);
      var indice = indice_tiro(t,contra);
      var indice2 = indice_tiro(t, rey_contra);
      if(indice[0] === -1 || indice2[0] === -1){
        return true;
      }
      return false;

    }

    //--------------------------------------------------------------------------
    function lleno(t) {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (t[i][j] === ' ') return false;
        }
      }
      return true;
    }
    //--------------------------------------------------------------------------

    if (err) {
      console.log(err);
      res.json(resultado);

    } else {
      let tablero = juego.getTablero();
      resultado.tablero = tablero;
      if (!juego.iniciado) {
        resultado.estado = 'espera';
        res.json(resultado);

      } else if (ganado(jugador.simbolo, tablero)) {
        resultado.estado = 'ganaste';
        eliminarJuegoJugadores();

      } else if (ganado(contrincante(jugador.simbolo), tablero)) {
        resultado.estado = 'perdiste';
        eliminarJuegoJugadores();

      } else if (lleno(tablero)) {
        resultado.estado = 'empate';
        eliminarJuegoJugadores();

      } else if (juego.turno === jugador.simbolo) {
        resultado.estado = 'tu_turno';
        res.json(resultado);

      } else {
        resultado.estado = 'espera';
        res.json(resultado);
      }
    }
  });
});

//------------------------------------------------------------------------------
router.get('/caballos/juegos_existentes/', (req, res) => {
  Juego
  .find({ iniciado: false })
  .sort('nombre')
  .exec((err, juegos) => {
    if (err) {
      console.log(err);
    }
    res.json(juegos.map(x => ({ id: x._id, nombre: x.nombre })));
  });
});

//------------------------------------------------------------------------------
router.put('/caballos/tirar/', (req, res) => {

  let resultado = { efectuado: false };

  obtenerJuegoJugador(req, (err, juego, jugador) => {

    //--------------------------------------------------------------------------
    function convertirEntero(s) {
      let r = /^(0*)(\d+)$/.exec(s);
      return r ? parseInt(r[2], 10) : -1;
    }

    //--------------------------------------------------------------------------
    function guardarCambios(tablero, ren, col) {
      var indices = indice_tiro(tablero, jugador.simbolo);
      tablero[ren][col] = jugador.simbolo;
      tablero[indices[0]][indices[1]] = " ";
      juego.turno = contrincante(juego.turno);
      juego.setTablero(tablero);
      juego.save((err) => {
        if (err) {
          console.log(err);
        }
        resultado.efectuado = true;
        resultado.tablero = tablero;
        res.json(resultado);
      });
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

    function contiene_tiro(arr, tiro) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i][0] === tiro[0] && arr[i][1] === tiro[1]) {
            console.log("Si esta");
            return true;
        }
      }
      return false;
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

    //--------------------------------------------------------------------------
    function tiroValido(tablero, ren, col, simbolo) {
      var rey  = constantes.SIMBOLO2[(s === constantes.SIMBOLO[1]) ? 1: 0];
      var indices = indice_tiro(tablero, simbolo);
      var tiros = tiros_posibles(indices[0], indices[1], tablero);

      if ( !contiene_tiro(tiros, [ren, col])){

        return false;
      }
      if( tablero[ren][col] === rey){

        return false;
      } 
      return true;
    }
    //--------------------------------------------------------------------------

    if (err) {
      console.log(err);
      res.json(resultado);

    } else {
      let ren = convertirEntero(req.body.ren);
      let col = convertirEntero(req.body.col);
      console.log(ren + "  " + col );
      if (juego.turno === jugador.simbolo) {
        let tablero = juego.getTablero();
        var valido = tiroValido(tablero, ren, col, jugador.simbolo);
        if ( valido ) {
          guardarCambios(tablero, ren, col);

        } else {
          res.json(resultado);
        }

      } else {
        res.json(resultado);
      }
    }
  });
});

//------------------------------------------------------------------------------
router.put('/caballos/unir_juego/', (req, res) => {

  let resultado = { unido: false, codigo: 'id_malo' };
  let idJuego = req.body.id_juego;
  let juego;
  let jugador;

  if (idJuego) {
    let findOne = promisify(Juego.findOne.bind(Juego));
    findOne({_id: idJuego})
    .then(arg => {
      juego = arg[0];
      if (juego.iniciado) {
        throw ABORTAR;
      } else {
        juego.iniciado = true;
        let save = promisify(juego.save.bind(juego));
        return save();
      }
    })
    .then(_ => {
      jugador = new Jugador({
        juego: juego._id,
        simbolo: constantes.SIMBOLO[1]
      });
      let save = promisify(jugador.save.bind(jugador));
      return save();
    })
    .then(_ => {
      req.session.id_jugador = jugador._id;
      resultado.unido = true;
      resultado.codigo = 'bien';
      resultado.simbolo = jugador.simbolo;
      resultado.tablero = juego.getTablero();
    })
    .catch(err => {
      if (err !== ABORTAR) {
        console.log(err);
      }
    })
    .then(_ => res.json(resultado));

  } else {
    res.json(resultado);
  }
});

//------------------------------------------------------------------------------
function contrincante(s) {
  return constantes.SIMBOLO[(s === constantes.SIMBOLO[1]) ? 0: 1];
}

function contrincante2(s) {
  return constantes.SIMBOLO2[(s === constantes.SIMBOLO[1]) ? 0: 1];
}

//------------------------------------------------------------------------------
function obtenerJuegoJugador(req, callback) {

  let idJugador = req.session.id_jugador;
  let juego;
  let jugador;

  if (idJugador) {
    let findOne = promisify(Jugador.findOne.bind(Jugador));
    findOne({ _id: idJugador })
    .then(arg => {
      jugador = arg[0];
      let findOne = promisify(Juego.findOne.bind(Juego));
      return findOne({ _id: jugador.juego });
    })
    .then(arg => {
      juego = arg[0];
    })
    .catch(err => console.log(err))
    .then(_ => callback(null, juego, jugador));

  } else {
    callback(new Error('La sesión no contiene el ID del jugador'));
  }
}
