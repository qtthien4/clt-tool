const express = require("express");
const { loginBluePrint } = require("./code");
const app = express();

app.get("/", (req, res) => {
  res.send("Welcome to tool");
});

app.get("/check-login", async (req, res) => {
  const key = await loginBluePrint();
  res.send(key);
});

app.listen(3001, () => console.log("Server ready on port 3001."));

module.exports = app;
