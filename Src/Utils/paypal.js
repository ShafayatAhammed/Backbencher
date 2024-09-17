const generatePaypalAccessToken = async () => {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${process.env.PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  return data.access_token;
};

const paypalOrderCreator = async (total) => {
  try {
    const accessToken = await generatePaypalAccessToken();

    const order = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: total.toFixed(2),
          },
        },
      ],
    };

    const response = await fetch(
      `${process.env.PAYPAL_API}/v2/checkout/orders`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(order),
      }
    );

    const data = await response.json();
    return data.id;
  } catch (err) {
    throw new Error(err);
  }
};

const paypalOrderCapturer = async (orderId) => {
  try {
    const accessToken = await generatePaypalAccessToken();

    const response = await fetch(
      `${process.env.PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    const transactionId = data.purchase_units[0].payments.captures[0].id;

    return transactionId;
  } catch (err) {
    throw new Error(err);
  }
};

export { paypalOrderCreator, paypalOrderCapturer };
