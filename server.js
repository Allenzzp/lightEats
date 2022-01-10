// load .env data into process.env
require("dotenv").config();

// Web server config
const PORT = process.env.PORT || 8081;
const sassMiddleware = require("./lib/sass-middleware");
const express = require("express");
const app = express();
//const morgan = require("morgan");

// PG database client/connection setup
const { Pool } = require("pg");
const dbParams = require("./lib/db.js");
const db = new Pool(dbParams);
db.connect(() => {
  console.log("database connected!");
});

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
//app.use(morgan("dev"));

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

app.use(
  "/styles",
  sassMiddleware({
    source: __dirname + "/styles",
    destination: __dirname + "/public/styles",
    isSass: false, // false => scss, true => sass
  })
);

app.use(express.static("public"));

// Separated Routes for each Resource
//const usersRoutes = require("./routes/users");
//const widgetsRoutes = require("./routes/widgets");

const ordersRoutes = require("./routes/orders");
const cartsRoutes = require("./routes/carts");
const restaurantsRoutes = require("./routes/restaurants");

// Mount all resource routes
// app.use("/api/users", usersRoutes(db));
// app.use("/api/widgets", widgetsRoutes(db));

app.use("/orders/", ordersRoutes(db));
app.use("/carts/", cartsRoutes(db));
app.use("/restaurants/", restaurantsRoutes(db));


// Note: mount other resources here, using the same pattern above

// Home page
// Warning: avoid creating more routes in this file!
// Separate them into separate routes files (see above).

app.get("/", (req, res) => {
  //sql
  const templatevars = {
    id: null
  };
  res.render("index", templatevars);
});

//clinet login
app.post("/1", (req, res) => {
  const user_id = 1;
  //sql query get userObj{id}
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
