const _ = require("lodash");
const JSSoup = require("jssoup").default;
const { fetchData } = require("../utils/parser");
const { TEMPORADA_LIVRE_ENDPOINT } = require("../constants/endpoints");
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáàãâéèêíìóòõôúùç ";

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
        const details = temporada.find("a", "show-details");

        return {
          title: _.upperCase(title.text),
          img: TEMPORADA_LIVRE_ENDPOINT + img.attrs.src,
          location: location ? location.text.replace("\n", "").trim() : "",
          price: price ? price.text.replace(/[^0-9]/g, "") : "",
          persons: persons ? persons._text.replace(/[^0-9]/g, "") : "",
          rooms: rooms ? rooms._text.replace(/[^0-9]/g, "") : "",
          origin: details ? details.attrs.href : ""
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

  app.get("/temporada/buscar", async function (req, res) {
    const origin = req.query.origin || "";

    if (!origin) {
      return res.status(400).send({
        success: false,
        message: "É necessário informar o link da temporada"
      });
    }

    const endpoint = TEMPORADA_LIVRE_ENDPOINT + origin;
    const response = await fetchData(endpoint);

    if (response.success) {
      try {
        const soup = new JSSoup(response.data);
        const slides = soup.find("ul", "slides");
        const imgsParsed = slides.findAll("img").map((slide) => {
          return TEMPORADA_LIVRE_ENDPOINT + slide.attrs.src;
        });

        const propertyDetails = soup.find("section", "property-details");
        const propertyDetailsHeader = propertyDetails.find("header");
        const title = propertyDetailsHeader.find("h1");
        const subtitle = propertyDetailsHeader.find("h2");

        const description = soup.find("article", "description");
        const descriptionText = description.find("h3").nextSibling;

        const details = soup.find("section", "details");
        const detailsPersons = details.find("strong");
        const detailsRooms = details.findAll("strong")[1];
        const coupleBeds = details.findAll("strong")[2];
        const singleBeds = details.findAll("strong")[3];

        const ownerInfo = soup.find("div", "anunciante-info");
        const ownerName = ownerInfo.find("p", "anunciante-nome");
        const ownerNameLink = ownerName.find("a");
        const ownerImage = ownerInfo.find("img");

        const containerComodidades = soup.find("div", "container-comodidade");
        const convenienceIcons = containerComodidades.findAll("div", "convenience-icon");

        const location = soup.find("div", { id: "property-map" });
        const locationP = location.nextSibling;

        const locationText = locationP.text
          .split("")
          .filter((word) => alphabet.includes(word))
          .join("");
        const locationTextWords = _.filter(locationText.split("  "), (word) => word != "");

        const locationData = {
          country: locationTextWords[0],
          state: locationTextWords[1],
          city: locationTextWords[2],
          neighborhood: locationTextWords[3],
          street: locationTextWords[4],
          complement: locationTextWords[5]
        };

        const preprocess = (text) => _.capitalize(_.words(_.trim(_.replace(text, /\n/g, ""))).join(" "));
        const preprocessNumber = (text) => parseInt(_.replace(text, /[^0-9]/g, ""));

        let features = convenienceIcons.map((icon) => {
          try {
            const strong = icon.find("strong");
            const text = strong.nextSibling;

            return {
              feature: preprocess(text),
              value: preprocessNumber(strong.text)
            };
          } catch (error) {
            try {
              const isDisabled = icon.attrs.class.includes("disabled");
              const span = icon.find("span");

              return {
                feature: span.text,
                value: !isDisabled
              };
            } catch (error) {
              return {
                feature: "",
                value: ""
              };
            }
          }
        });

        features = _.filter(features, (feature) => feature.feature !== "");

        const prices = soup.findAll("span", "price");
        let pricesNumbers = prices.map((price) => {
          try {
            const span = price.find("span");
            return preprocessNumber(span.text);
          } catch (error) {
            return NaN;
          }
        });

        pricesNumbers = _.filter(pricesNumbers, (price) => !isNaN(price));

        const priceNow = pricesNumbers[0];
        const minPrice = _.min(pricesNumbers);
        const maxPrice = _.max(pricesNumbers);
        const avgPrice = _.mean(pricesNumbers);

        const data = {
          title: title ? preprocess(title.text) : "",
          subtitle: subtitle ? preprocess(subtitle.text) : "",
          description: descriptionText ? preprocess(descriptionText._text) : "",
          number_of_persons: detailsPersons ? preprocessNumber(detailsPersons.text) : "",
          number_of_rooms: detailsRooms ? preprocessNumber(detailsRooms.text) : "",
          number_of_couple_beds: coupleBeds ? preprocessNumber(coupleBeds.text) : "",
          number_of_single_beds: singleBeds ? preprocessNumber(singleBeds.text) : "",
          owner_name: ownerNameLink ? preprocess(ownerNameLink.text) : "",
          owner_img: ownerImage ? TEMPORADA_LIVRE_ENDPOINT + ownerImage.attrs.src : "",
          location: locationData,
          price_now: priceNow,
          min_price: minPrice,
          max_price: maxPrice,
          avg_price: avgPrice,
          imgs: imgsParsed,
          features: features
        };

        res.status(200).send({
          ...response,
          data
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          error: error.message,
          endpoint: endpoint,
          data: null
        });
      }
    } else {
      res.status(500).json(response);
    }
  });
};
