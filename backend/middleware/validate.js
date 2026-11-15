const ApiError = require("../utils/ApiError");

// validate(zodSchema) -> validates and cleans req.body
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    throw new ApiError(400, errors[0] ? `${errors[0].field ? errors[0].field + ": " : ""}${errors[0].message}` : "Validation failed", errors);
  }
  req.body = result.data;
  next();
};

module.exports = validate;
