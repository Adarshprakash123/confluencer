const AppError = require('../errors/AppError');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => {
          const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
          return `${path}${issue.message}`;
        })
        .join('; ');
      return next(new AppError(400, 'VALIDATION_ERROR', message));
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = validate;
