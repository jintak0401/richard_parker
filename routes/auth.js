require("dotenv").config();
const express = require("express");
const router = express.Router();
const moment = require("moment");
const jwt = require("jsonwebtoken");
const emailSender = require("../utils/emailSender");
const { User } = require("../models");

// -------------------- 상수들 ----------------------
const loginRequests = {}; // 원소-> {email: [checkNum, moment(), trial, id]}, checkNum 은 5자리 숫자, trial 은 시도 횟수, id는 DB상 유저id, nick은 유저닉네임
const timeInterval = 60_000; // 1분
const trialLimit = 5; // 로그인 checkNum 의 최대(trailLimit === trial 일 경우 loginRequests 에서 제거)
// -------------------- 상수들 ----------------------

// -------------------- 함수들 ----------------------

// access token 발급 => payload: {id: DB상 유저 id, nick: 유저닉네임}
const generateAccessToken = (id, nick) => {
  // 인자: DB상 유저id
  const accessToken = jwt.sign({ id, nick }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "30m",
  });
  return accessToken;
};

// refresh token 발급 => payload: {id: DB상 유저 id}
const generateRefreshToken = (id) => {
  // 인자: DB상 유저id
  const refreshToken = jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "20 days",
  });
  return refreshToken;
};

// 5자리 인증번호 생성
const generateCheckNum = (min, max) => {
  return Math.floor(Math.random() * (max - min)) + min;
};

// 인증번호를 재전송
const resendCheckNum = (email) => {
  const newCheckNum = generateCheckNum(10_000, 100_000);
  loginRequests[email] = [
    newCheckNum, // 인증번호
    moment(), // 3분을 확인하기 위한 시간값
    0, // trial
    loginRequests[email][3], // id
    loginRequests[email][4], // nickname
  ];
  // 인증번호 이메일로 발송
  emailSender.sendLoginMail(email, newCheckNum);
};

// access_token 확인
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  // access_token이 만료되었는지 & 변조되었는지 검사
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET),
    (err, user) => {
      if (err) return res.json({ msg: "expired" });
      req.body.user = user;
      next();
    };
};

// 동일한 메일로 회원가입이 되어있는지 검사
const checkSameEmail = async (req, res, next) => {
  const email = req.body.email;
  console.log(req.body);
  try {
    const existSameEmail = await User.findOne({
      where: {
        email: email,
      },
    });
    if (existSameEmail) {
      return res.json({ msg: "same email" });
    }
    next();
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// 동일한 닉네임이 있는지 검사
const checkSameNick = async (req, res, next) => {
  const nick = req.body.nick;
  try {
    const existSameNick = await User.findOne({
      where: {
        nick: nick,
      },
    });
    if (existSameNick) {
      return res.json({ msg: "same nick" });
    }
    next();
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// 없는 계정인지 검사 => 없다면 {msg: "no account"} 전송, 있다면 next()
const checkNoAccount = async (req, res, next) => {
  console.log(req.body);

  // DB I/O를 줄이기 위해 loginRequests에 없을 때만 DB find를 진행
  if (!loginRequests[req.body.email]) {
    try {
      const account = await User.findOne({
        attributes: ["id", "nick"],
        where: { email: req.body.email },
      });
      // 계정이 있을 경우 로그인 진행
      if (account) {
        req.body.id = account.dataValues.id;
        req.body.nick = account.dataValues.nick;
        return next();
      } else return res.json({ msg: "no account" }); // 계정이 없을 경우 계정이 없다는 메시지 전송
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  return next();
};

// 1분간격으로 호출
// 최초 로그인 요청 후 3분동안 로그인을 하지 않으면 로그인 요청 리스트에서 제거
setInterval(() => {
  Object.keys(loginRequests).map((email) => {
    const requestTime = loginRequests[email] && loginRequests[email][1];
    if (requestTime && moment() - requestTime > timeInterval * 3) {
      delete loginRequests[email];
    }
  });
}, timeInterval);
// -------------------- 함수들 ----------------------

// -------------------- 라우터 ----------------------

// 회원가입
router.post(
  "/register",
  checkSameEmail, // 동일한 이메일로 가입되어있는지 검사
  checkSameNick, // 동일한 닉네임으로 가입되어있는지 검사
  async (req, res, next) => {
    const { email, nick } = req.body;
    try {
      // 새 계정 추가
      await User.create({
        email: email,
        nick: nick,
      });
      return res.json({ msg: "done" });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
);

// 로그인 요청
router.post("/login", checkNoAccount, async (req, res, next) => {
  const { email, checkNum, msg } = req.body;

  console.log(req.body);

  // 로그인 요청을 했었던 경우
  if (loginRequests[email]) {
    // 최초 로그인 재요청 => loginRequests 갱신 & 이메일 재전송
    if (msg === "resend") {
      resendCheckNum(email);
      return res.json({ msg: "send mail" });
    }
    // 생성해준 checkNum 과 보내온 checkNum 이 일치하는 경우 => 로그인
    else if (checkNum === loginRequests[email][0]) {
      const [id, nick] = loginRequests[email].slice(3); // 3, 4번째 원소가 각각 id와 nick
      const accessToken = generateAccessToken(id, nick);
      const refreshToken = generateRefreshToken(id);
      try {
        // refresh_token 을 DB에 갱신
        await User.update(
          {
            refreshToken: refreshToken,
          },
          {
            where: { id: id },
          }
        );
        delete loginRequests[email];
        return res.json({ accessToken, refreshToken, msg: "done" });
      } catch (err) {
        console.error(err);
        next(err);
      }
    }
    // 생성해준 checkNum 과보내온 checkNum 이 다른 경우 => 에러 메시지
    else {
      // 모종의 이유로 인증번호 전송 후, 아무런 입력값 없이 다시 로그인 요청한 경우
      if (!checkNum) {
        resendCheckNum(email);
        return res.json({ msg: "send mail" });
      }

      // 5번 동안 틀릴 경우 => 재로그인 요구
      else if (++loginRequests[email][2] === trialLimit) {
        delete loginRequests[email];
        return res.json({ msg: "retry" });
      }

      // 인증번호가 일치하지 않는 경우 => 다시 입력 요구
      return res.json({ msg: "not equal" });
    }
  }
  // 최초의 로그인 요청 & 인증번호 요청 후 3분 안에 로그인 안한 경우
  else {
    // 3분 이후에 인증번호 입력
    if (checkNum) {
      return res.json({ msg: "expired" });
    }
    // 최초의 로그인 요청
    // loginRequests에 원소 추가, checkNum 은 5자리 숫자(10,000 ~ 99,999)
    const newCheckNum = generateCheckNum(10_000, 100_000);

    loginRequests[email] = [
      newCheckNum, // 인증번호
      moment(), // 3분 확인용 시간값
      0, // trial
      req.body.id, // id
      req.body.nick, // 닉네임
    ];
    try {
      // 인증번호 이메일로 발송
      await emailSender.sendLoginMail(email, newCheckNum);
      return res.json({ msg: "send mail" });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
});

// 로그아웃 요청
router.post("/logout", async (req, res, next) => {
  const decodedRefreshToken = jwt.decode(
    req.body.refreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );
  if (decodedRefreshToken == null) {
    return res.json({ msg: "wrong refreshToken" });
  }
  // 기존 refresh token을 DB에서 삭제
  try {
    await User.update(
      {
        refreshToken: null,
      },
      {
        where: {
          id: decodedRefreshToken.id,
        },
      }
    );
    return res.json({ msg: "done" });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

// 새 refresh token & access token 요청
router.post("/token", (req, res, next) => {
  const { refreshToken: oldRefreshToken } = req.body;

  // req 에 refreshToken이 담겨있지 않은 경우 => 재로그인
  if (oldRefreshToken == null) return res.json({ msg: "need login" });
  else {
    jwt.verify(
      oldRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, user) => {
        // 만료되었을 경우 => 재로그인
        if (err) return res.json({ msg: "need login" });

        try {
          // DB의 refresh_token과 다를 경우(다른 기기에서 로그인 했었을 경우) => 다시 로그인하도록 요구
          const dbOldRefreshToken = await User.findOne({
            attributes: ["refreshToken"],
            where: { id: user.id },
          });
          if (oldRefreshToken !== dbOldRefreshToken.dataValues.refreshToken)
            return res.json({ msg: "need login" });

          // 만료되지 않고 기존 refresh_token과 일치할 경우 => 새 access_token & refresh_token 발급
          const newAccessToken = generateAccessToken(user.id, user.nick);
          const newRefreshToken = generateRefreshToken(user.id);

          // 기존 refresh_token을 DB에서 삭제 & 새 refresh_token 추가
          await User.update(
            { refreshToken: newRefreshToken },
            {
              where: {
                id: user.id,
              },
            }
          );
          return res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            msg: "done",
          });
        } catch (err) {
          console.error(err);
          next(err);
        }
      }
    );
  }
});
// -------------------- 라우터 ----------------------

module.exports = router;
