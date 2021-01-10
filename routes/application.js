const express = require("express");

const router = express.Router();

const arr = {};

router.post("/url", (req, res) => {
  const { email, url } = req.body;
  arr["tkadbrgkrdnjs7&"] = { email, url };
  res.json({ res: "done" });
});

router.get("/redirect", (req, res) => {
  const url = arr["tkadbrgkrdnjs7&"]
    ? arr["tkadbrgkrdnjs7&"].url
    : `http://localhost:${process.env.PORT || 8010}/expired`;
  res.redirect(url);
});

router.get("/expired", (req, res) => {
  res.json({ res: "expired" });
});
