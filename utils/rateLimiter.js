const rateLimit = require("express-rate-limit");

const createRateLimiter = (options = {}) =>
  rateLimit({
    windowMs: options.windowMs || 60 * 60 * 1000, // 1 hour
    max: options.max || 100,
    message: options.message || "Too many requests, please try again later.",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

module.exports = createRateLimiter;
