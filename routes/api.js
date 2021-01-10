const express = require("express");
const { Cat } = require("../models");
const deeplink = require("node-deeplink");

const router = express.Router();

const sendNextCat = async (res) => {
  const nextCat = await Cat.findOne({ where: { fur: null } });
  res.json({
    id: nextCat.dataValues.id,
    imgURL: `http://localhost:${process.env.PORT || 8010}/images/${
      nextCat.dataValues.imgURL
    }`,
  });
};

router.get("/", async (req, res, next) => {
  try {
    sendNextCat(res);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.get(
  "/link",
  deeplink({
    url: "jintak://wlsxkr.com/path?key=12356&val=seadkfgjnasd",
    fallback: "http://localhost:8010/expired",
    android_package_name: "com.jintak.uni_link_practice",
  })
);

router.post("/", async (req, res, next) => {
  const { id, fur, foot } = req.body;
  try {
    await Cat.update({ fur: fur, foot: foot }, { where: { id: id } });
    sendNextCat(res);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

const arr = {};

router.post("/url", (req, res) => {
  const { email, url } = req.body;
  console.log(req.body);
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

module.exports = router;
