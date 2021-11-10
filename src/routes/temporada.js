const _ = require("lodash");
const JSSoup = require("jssoup").default;
const { fetchData } = require("../utils/parser");
const { TEMPORADA_LIVRE_ENDPOINT } = require("../constants/endpoints");

module.exports = function (app) {
  app.get("/temporada", async function (req, res) {
    const page = req.query.page || 1;
    const state = req.query.state ? _.kebabCase(req.query.state) : "";
    const city = req.query.city ? _.kebabCase(req.query.city) : "";

    const endpoint =
      TEMPORADA_LIVRE_ENDPOINT + `/aluguel-temporada/brasil${state ? `/${state}` : ""}${city ? `/${city}` : ""}?page=${page}`;

    const response = await fetchData(endpoint);

    if (response.success) {
      const soup = new JSSoup(response.data);

      const temporadas = soup.findAll("div", "l50");

      const temporadasParsed = temporadas.map((temporada) => {
        const img = temporada.find("img");
        const title = temporada.find("span", "title");
        const price = temporada.find("span", "price");
        const location = temporada.find("div", "location");
        const persons = temporada.find("i", "icon-users").nextSibling;
        const rooms = temporada.find("i", "icon-lodging").nextSibling;

        return {
          title: _.upperCase(title.text),
          img: TEMPORADA_LIVRE_ENDPOINT + img.attrs.src,
          location: location ? location.text.replace("\n", "").trim() : "",
          price: price ? price.text.replace(/[^0-9]/g, "") : "",
          persons: persons ? persons._text.replace(/[^0-9]/g, "") : "",
          rooms: rooms ? rooms._text.replace(/[^0-9]/g, "") : ""
        };
      });

      res.status(200).send({
        ...response,
        data: temporadasParsed
      });
    } else {
      res.status(500).json(response);
    }
  });
};
