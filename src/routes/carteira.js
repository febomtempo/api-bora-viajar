const _ = require("lodash");
const axios = require("axios");

const MIN_PAGES = 120;

const formatBRL = (value) => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
};

const sortRandom = (a, b) => {
  return Math.random() - 0.5;
};

module.exports = function (app) {
  app.get("/carteira/recomendacao", async function (req, res) {
    const balance = req.query.balance ? parseFloat(req.query.balance) : 0;
    const endpoint = `https://api-bora-viajar-ivzdfsjdd-febomtempo.vercel.app/temporada`;

    const listPromises = [];

    for (let i = 1; i <= MIN_PAGES; i++) {
      listPromises.push(axios.get(`${endpoint}?page=${i}`));
    }

    try {
      const response = await axios.all(listPromises);
      const responseData = _.flatten(response.map((r) => r.data));
      let responseDataTemporadas = responseData.map((r) => r.data);
      responseDataTemporadas = _.flatten(responseDataTemporadas);

      let dataFiltered = _.filter(responseDataTemporadas, (item) => {
        return balance >= parseFloat(item.price);
      });

      dataFiltered = _.sortBy(dataFiltered, sortRandom);

      if (dataFiltered.length === 0) {
        dataFiltered = `O seu saldo de ${formatBRL(balance)} não é suficiente para planejar sua viagem.`;
      }

      res.status(200).json({
        success: true,
        error: null,
        data: dataFiltered
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        data: null
      });
    }
  });
};
