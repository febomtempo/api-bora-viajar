const axios = require("axios");

async function fetchData(url) {
  try {
    const response = await axios.get(url);

    return {
      success: true,
      error: null,
      endpoint: url,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      endpoint: url,
      data: null
    };
  }
}

module.exports = {
  fetchData
};
