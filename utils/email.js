const nodemailer = require("nodemailer");
const pug = require("pug");

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = `${process.env.USERNAME} <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === "production") {
      return nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.GMAIL_EMAIL,
          pass: process.env.GMAIL_PASSWORD,
        },
      });
    }
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // this will do the actual sending , this will receive a template and a subject
  async send(template, subject, extraData = {}) {
    //1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
      ...extraData,
    });
    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      // text: options.message, // we want a way to convert a HTML to a simple text (optional) he installed a package called(html-to-text) and used like htmlToText.fromString(html)
    };

    //3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
    // await transporter.sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to the Natours Family!");
  }

  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "Your Password Reset Token (VALID FOR ONLY 10 MINS)"
    );
  }

  async sendEmailVerification(otp) {
    await this.send("emailVerification", "mailVerification", { otp });
  }
};

// const sendEmail = async (options) => {
//   //1) Create a transporter-> a service that will send the email
//   // const transporter = nodemailer.createTransport({
//   //   host: process.env.EMAIL_HOST,
//   //   port: process.env.EMAIL_PORT,
//   //   auth: {
//   //     user: process.env.EMAIL_USERNAME,
//   //     pass: process.env.EMAIL_PASSWORD,
//   //   },
//   // });
//   //2) Define the Email Options
//   // const mailOptions = {
//   //   from: "robersamy <robersamy04@gmail.com>",
//   //   to: options.email,
//   //   subject: options.subject,
//   //   text: options.message,
//   //   // html: // we can convert this text to html
//   // };
//   //3) Actually send the Email
//   // await transporter.sendMail(mailOptions);
// };
