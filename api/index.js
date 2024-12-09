const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Express on Vercel"));

app.listen(3001, () => console.log("Server ready on port 3001."));

module.exports = app;
