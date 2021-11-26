const temporada = require("./temporada");
const carteira = require("./carteira");

module.exports = (app) => {
  temporada(app);
  carteira(app);
};
