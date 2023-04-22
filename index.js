var express = require("express");
const lottery = require("./lottery");

var app = express();

const axios = require("axios");
const web3 = require("./web3");
const { scheduleJob } = require("node-schedule");

const cost_of_Indemnity = 20000000000000000;

const getAllPolicyHolders = async (account) => {
  const data = await lottery.methods.view_all_policies().call({
    from: account,
  });
  return data;
};

const poorWeatherConditions = [
  "Moderate or heavy rain shower",
  "Partly cloudy",
  "Cloudy",
  "Light rain shower",
];

const generateOptions = ({ city, date }) => {
  return {
    method: "GET",
    url: "https://weatherapi-com.p.rapidapi.com/history.json",
    params: { q: city, dt: date, lang: "en" },
    headers: {
      "X-RapidAPI-Key": "",
      "X-RapidAPI-Host": "weatherapi-com.p.rapidapi.com",
    },
  };
};

const getApiData = async (dataArray) => {
  const options = dataArray.map((d) => generateOptions(d));
  const requests = options.map((option) => axios.request(option));
  const responses = await Promise.allSettled(requests);
  const weatherFiltered = responses.map(
    (d) => d?.value?.data?.forecast?.forecastday?.[0]?.day?.condition?.text
  );
  return weatherFiltered;
};

const sendTheAdressesToNetwork = async (addresses, managerAccount) => {
  const amountToSend = cost_of_Indemnity * addresses?.length;
  console.log(amountToSend.toString());
  const response = await lottery.methods.payIndemnity(addresses).send({
    from: managerAccount,
    value: amountToSend.toString(),
  });
  console.log(response);
  return response;
};

const review = async () => {
  try {
    const accountNumber = "0x03dE94ceE8fe3D1D770f5562a28F12c1bFd6E47b";
    let policyHolders = await getAllPolicyHolders(accountNumber);
    policyHolders = policyHolders.filter(
      (d) =>
        d.passenger_address !== "0x0000000000000000000000000000000000000000"
    );
    console.log(policyHolders);
    const fetchDestinationAndTimeData = policyHolders.map((d) => ({
      city: d.departure_city,
      date: d.departure_date,
    }));
    const weatherData = await getApiData(fetchDestinationAndTimeData);
    console.log(weatherData);
    let adressToRefund = policyHolders.map((d, idx) => {
      if (poorWeatherConditions.includes(weatherData?.[idx]))
        return d?.passenger_address;
    });
    adressToRefund = adressToRefund.filter((d) => d !== undefined);
    console.log(adressToRefund);
    if (adressToRefund?.length != 0)
      await sendTheAdressesToNetwork(adressToRefund, accountNumber);
    console.log(
      JSON.stringify({ success: "success", adressToRefund, accountNumber })
    );
  } catch (err) {
    console.log(err);
    console.log(JSON.stringify({ err, fail: "Fail" }));
  }
};

app.get("/", async (req, res, next) => {
  await review();
  res.send("Done");
});

// const job = scheduleJob("*/1 * * * *", async () => {
//   await review();
// });

app.listen(4000, () => {
  console.log("Server running on port 4000");
});
