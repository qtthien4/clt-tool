const express = require("express");
const {
  loginBluePrint,
  getKeyOnS3,
  checkKey,
  upKeyOnS3,
  checkTimeWork,
} = require("./code");
const app = express();

app.get("/", (req, res) => {
  res.send("Welcome to tool");
});

app.get("/check-login", async (req, res) => {
  let key = await getKeyOnS3();
  if (!key) {
    res.console.error("can not get key!");
  }

  const checkKeyExpire = await checkKey(key);

  if (!checkKeyExpire) {
    key = await loginBluePrint();
    await upKeyOnS3(key);
  }
  await checkTimeWork(key);
  res.status(200).send("success!");
});

app.listen(3001, () => console.log("Server ready on port 3001."));

exports.myFunction = app;
