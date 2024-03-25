const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");

dotenv.config({ path: "./../config.env" });

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.pay = async (req, res) => {
  const { token, amount } = req.body;
  const idempotencyKey = uuidv4();

  return stripe.customers
    .create({
      email: token.email,
      source: token,
    })
    .then((customer) => {
      stripe.charges.create(
        {
          amount: amount * 100,
          currency: "usd",
          customer: customer.id,
          receipt_email: token.email,
          description: `Purchased the product`,
        },
        { idempotencyKey }
      ).then((result) => {
        res.status(200).json(result);
      }
        ).catch((err) => {
            console.log(err);
        });
    });
};
