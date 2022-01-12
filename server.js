// load .env data into process.env
require("dotenv").config();
// const accoutSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOEKN;
// const client = require("twilio")(accoutSid, authToken);
// client.messages.create({
//   to: "7782516942",
//   from: "(778) 601-9055",
//   body: "your order has been sent to rest!"
// })
// .then((message) => {
//   console.log(message.sid);
// });

// Web server config
const PORT = process.env.PORT || 8080;
const sassMiddleware = require("./lib/sass-middleware");
const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
// const morgan = require("morgan");

// PG database client/connection setup
const { Pool } = require("pg");
const dbParams = require("./lib/db.js");
const db = new Pool(dbParams);
db.connect(() => {
  console.log("database connected!");
});

app.set("view engine", "ejs");
// app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));//based on body-parser
app.use(
  "/styles",
  sassMiddleware({
    source: __dirname + "/styles",
    destination: __dirname + "/public/styles",
    isSass: false, // false => scss, true => sass
  })
);
app.use(express.static("public"));
app.use(cookieParser());

// Separated Routes for each Resource
const loginRoutes = require("./routes/login");
const logoutRoutes = require("./routes/logout");
const ordersRoutes = require("./routes/orders");
const cartsRoutes = require("./routes/carts");
const restaurantsRoutes = require("./routes/restaurants");
const orderStatus = require("./routes/current");//check this

// Mount all resource routes
app.use("/orders/", ordersRoutes(db));
app.use("/carts/", cartsRoutes(db));
app.use("/restaurants/", restaurantsRoutes(db));
app.use("/current/",orderStatus(db));
app.use("/login/", loginRoutes(db));
app.use("/logout/", logoutRoutes());

// Note: mount other resources here, using the same pattern above

// Home page
app.get("/", (req, res) => {
  //const user = req.session.user;
  let user = req.cookies["user"];
  const rest_id = req.cookies["rest_id"];
  //if owner, go to rest page
  if (rest_id) {
    return res.redirect(`/restaurants/${rest_id}`);
  }
  if (user) {
    user = JSON.parse(user);
  }
  db.query(`
  SELECT restaurants.*, menu_items.name AS item_name, price, image_url, menu_items.id AS item_id
  FROM menu_items
  JOIN restaurants ON
  restaurants.id = restaurant_id`)
  .then(data => {
    const menuItems = data.rows;
    const templatevars = {
      user,
      rest_id,
      menuItems
    };
    res.render("index", templatevars);
  })
});

app.listen(PORT, () => {
  console.log(`app listening on port ${PORT}`);
});
