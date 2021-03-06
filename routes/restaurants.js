require("dotenv").config();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

const queryString = `SELECT  orders.*,customers.name as customer_name ,customers.id as customer_id,menu_items.name,menu_items.price,orders_items.quantity,customers.phone as phone
FROM orders
JOIN orders_items ON orders.id = orders_items.order_id
JOIN customers ON customer_id= customers.id
JOIN menu_items ON menu_items.id = orders_items.menu_item_id
WHERE  orders_items.quantity > 0 AND`;

const pendingquery = `${queryString} picked_at IS  NULL ORDER BY orders.id;`;
const previousquery = `${queryString} picked_at IS NOT NULL ORDER BY orders.id  DESC;`;   // delivered

module.exports = (router, db) => {

  router.get("/new", (req, res) => {
    let rest_id = req.cookies["rest_id"];
    if (!rest_id) {
      return res.redirect("/");
    }
    const user = req.cookies["user"];
    const templateVars = {
      rest_id,
      user,
      result: null
    }
    db.query(pendingquery)
    .then(data => {
      const result = data.rows;

      if (result.length !== 0) {
        const tempVars = parsedata(result);

        templateVars["result"] = tempVars;
        res.render('restaurants', templateVars);
      } else {
        res.render('restaurants', templateVars);
      }
    })
    .catch(err => res.json(err.message));
  });

  router.get("/previous", (req, res) => {
    let rest_id = req.cookies["rest_id"];
    if (!rest_id) {
      return res.redirect("/");
    }
    const user = req.cookies["user"];
    const templateVars = {
      rest_id,
      user,
      result: null
    }
    db.query(previousquery)
    .then(data => {
      const result = data.rows;
      if (result.length !== 0) {
        const tempVars = parsedata(result);

        templateVars["result"] = tempVars;
        res.render('restaurants', templateVars);
      } else {
        res.render('restaurants', templateVars);
      }
    })
    .catch(err => res.json(err.message));
  });

  router.get("/:restaurant_id", (req, res) => {
    let rest_id = req.cookies["rest_id"];
    if (!rest_id) {
      return res.redirect("/");
    }
    const user = req.cookies["user"];
    const templateVars = {
      rest_id,
      user,
      result: null
    }
    db.query(pendingquery)
    .then(data => {
      const result = data.rows;
      if (result.length !== 0) {
        const tempVars = parsedata(result);
        templateVars["result"] = tempVars;
        res.render('restaurants', templateVars);
      }
      else {
        res.render('restaurants', templateVars);
      }
    })
    .catch(err => res.json(err.message));
  });

  router.post("/new/accepted", (req, res) => {
    const order_id = Number(req.body.order_id);
    const set_time = req.body.qty;
    const phone = `+1${req.body.phone}`;
    const queryString = `UPDATE orders SET accepted_at = $1, set_time = $2  WHERE id = $3;`;
    db.query(queryString, [new Date(), set_time, order_id])
    .then(() => {
      sendTextMessages(`Your order will be ready in ${set_time} minutes.`, phone);
      res.redirect("/restaurants/new");
    })
    .catch(err => res.json(err.message));
  });

  router.post("/new/ready", (req, res) => {
    const order_id = Number(req.body.order_id);
    const phone = `+1${req.body.phone}`;
    const queryString = `UPDATE orders SET prepared_at = $1 WHERE id = $2 ;`;
    db.query(queryString, [new Date(), order_id])
    .then(() => {
      sendTextMessages(`Your order is ready to pick up`,phone);
      res.redirect("/restaurants/new");
    })
    .catch(err => res.json(err.message));
  });

  router.post("/new/delivered", (req, res) => {
    const order_id = Number(req.body.order_id);
    const phone = `+1${req.body.phone}`;
    const queryString = `UPDATE orders SET picked_at = $1 WHERE id = $2;`;
    db.query(queryString, [new Date(), order_id])
    .then(() => {
      sendTextMessages(`Thanks from ordering Light Eats`, phone);
      res.redirect("/restaurants/new");
    })
    .catch(err => res.json(err.message));
  });

  //when customer makes order
  router.post("/orders/:restaurant_id", (req, res) => {
    const orderInfo = JSON.parse(req.cookies["user"]);
    if (orderInfo.items.length === 0) {
      return res.redirect("/");
    }
    let total = Number(orderInfo.total.toFixed(2)); //make sure no long floating points
    const queryString = `
    INSERT INTO orders (customer_id, order_total)
    VALUES ($1, $2) RETURNING *;`;

    db.query(queryString, [orderInfo.id, total * 100])
    .then((data) => {
      const order_id = data.rows[0].id;
      let arrayOfItems = orderInfo.items;
      let queryString = `INSERT INTO orders_items (order_id, menu_item_id, quantity) VALUES `;
      let values = [];
      let inc = 1;
      for (let i = 0; i < arrayOfItems.length; i++) {
        let firstItem = i + inc++;
        // inc++;
        let secondItem = i + inc++;
        // inc++;
        let thirdItem = i + inc;
        //building query
        queryString = `${queryString}($${firstItem}, $${secondItem}, $${thirdItem}),`;
        if (i >= arrayOfItems.length - 1) {
          queryString = queryString.slice(0, queryString.length - 1);
          queryString += ";";
        }
        //building insert variables
        values.push(order_id);
        values.push(Number(arrayOfItems[i].item_id)); //item_id is Integer in db
        values.push(arrayOfItems[i].number);
      }
      db.query(queryString, values)
      .then(() => {
        sendTextMessages(`You have 1 new order!`, '+17782516942');
        delete orderInfo.quantity;
        delete orderInfo.items;
        delete orderInfo.total;
        res.cookie("user", JSON.stringify(orderInfo));
        res.redirect("/orders/current"); //do something here!!!!!!!!!!!!!!!!!!!!
      })
      .then(() => {
        res.redirect("/restaurants/new");
      })
      .catch(err => res.json(err.message));
    })
    .catch(err => res.json(err.message));
  });
  return router;
};

const sendTextMessages = function(messages,customer_phone){ //"You have 1 new order!", '+17782516942'
  client.messages.create({
    body: messages,
    to: customer_phone,
    from: '+14387963567' //num u bought
  })
  .then(message => console.log(message))
  .catch(error => console.log(error))
}

const parsedata = function (result) {
  let orders = {};
  let date = null;
  for (let i = 0; i < result.length; i++) {

    let status = "Pending";
    let orderId = result[i].id;
    if (result[i].accepted_at) {
      status = `Ready in ${result[i].set_time} minutes`;
    }
    if (result[i].prepared_at) {
      status = `Ready to pick up`;
    }
    if (result[i].picked_at) {
      status = "Delivered";
      date = result[i].picked_at.toString().substring(0, 21);
    }

    if (!orders[' ' + orderId]) {
        orders[' ' + orderId] = {
          id: orderId,
          phone: result[i].phone,
          customer_name: result[i].customer_name,
          order_total: Number((result[i].order_total / 100).toFixed(2)), //???
          quantity: 0,
          items: [],
          status: status,
          created_at: result[i].created_at.toString().substring(0, 21),
          picked_at: date,
          set_time: result[i].set_time
        }
    }
    orders[' ' + orderId].items.push({
      item_name: result[i].name,
      quantity: result[i].quantity,
      price: result[i].price
    });
    orders[' ' + orderId].quantity += result[i].quantity;
  }
  return orders;
}









