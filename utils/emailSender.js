require("dotenv").config();
const nodemailer = require("nodemailer");

const emojiList = ["😺", "😸", "😾", "😿", "🙀", "😽", "😼", "😻", "😹", "🐱"];

const randomPickEmoji = () => {
  return emojiList[Math.floor(Math.random() * emojiList.length)];
};

const transporter = nodemailer.createTransport({
  host: "smtp.naver.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.ADMIN_EMAIL_ID, // generated ethereal user
    pass: process.env.ADMIN_EMAIL_PW, // generated ethereal password
  },
});

const sendLoginMail = async (email, checkNum) => {
  const adminAccount = "jintak0401@naver.com";
  const emoji = [randomPickEmoji(), randomPickEmoji()];

  // send mail with defined transport object
  const tmp = await transporter.sendMail({
    from: `"ADMIN" <${adminAccount}>`, // sender address
    to: email, // list of receivers
    subject: `${emoji[0]} 안녕하세요! ${emoji[1]}`, // Subject line
    // text: `인증번호 ${checkNum}`, // plain text body
    html: "<h3>인증번호는 " + checkNum + " 입니다</h3>", // html body
  });
};

module.exports = {
  sendLoginMail,
};
