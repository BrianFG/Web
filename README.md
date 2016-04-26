# Juego de Caballos Danzarines

Esta es una aplicación web de NodeJS que implementa el el juego "Caballos Danzarines". Permite que múltiples parejas de jugadores jueguen simultáneamente.


## 0. Requisitos

Para poder ejecutarse se requiere tener instalado el siguiente software:

- Node 4.2.*
- MongoDB 2.6.*

## 1. Instalación

La aplicación requiere instalar varios módulos de Node. Teclea el siguiente comando desde el directorio `caballos`:

      npm install

## 2. Corriendo los servidores

Para arrancar el servidor de Mongo se debe escribir lo siguiente en una terminal:

      mongod --bind_ip=$IP --nojournal



Para iniciar el servidor web, es necesario escribir lo siguiente en la terminal:

      npm start

## 3. Cliente de texto

Dentro del directorio `caballos` teclea lo siguiente en una terminal(Este comando servirá solo si se esta utilizando la plataforma Cloud9):

      npm run-script cliente

Si el anterior comando no funciona ya que no se esta utilizando Cloud9, teclea lo siguiente (cambia `PUERTO` por el puerto en el que el servidor est'e corriendo):

      node cliente-texto-caballos.js http://localhost:PUERTO

Para poder ver el juego en acción es necesario abrir otra terminal para abrir un nuevo cliente de texto y jugar contra el anterior creado,

