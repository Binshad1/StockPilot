const multer = require("multer");
const ApiError = require("../utils/ApiError");

const notFound = (req, res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// One place that turns every kind of error into the same JSON shape:
// { message: string, errors?: [{field, message}] }
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || "Server error";
  let errors = err.errors;

  if (err.name === "ValidationError" && err.errors && !(err instanceof ApiError)) {
    status = 400;
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = errors[0].message;
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || "value";
    message = `${field === "sku" ? "SKU" : field} already exists`;
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "Image must be smaller than 5 MB" : err.message;
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Malformed JSON body";
  }

  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === "production") message = "Internal server error";
  }
  res.status(status).json({ message, ...(errors ? { errors } : {}) });
};

module.exports = { notFound, errorHandler };
