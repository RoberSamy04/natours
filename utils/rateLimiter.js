const rateLimit = require("express-rate-limit");

const createRateLimiter = (options = {}) =>
  rateLimit({
    windowMs: options.windowMs || 60 * 60 * 1000,
    max: options.max || 100,
    message: options.message || "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

module.exports = createRateLimiter;
