const cors = require("cors");
const express = require("express");
const routes = require("./routes");

const app = express();
app.use(express.json());
app.use(cors());
routes(app);

app.listen(process.env.PORT || 3000, () => {
  console.clear();
  console.log("Server ta ON!!!");
  console.log("RAJ!!!");
});
