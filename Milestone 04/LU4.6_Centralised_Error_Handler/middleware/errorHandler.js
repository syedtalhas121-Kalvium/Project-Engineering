function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';

  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'A record with that value already exists';
  }

  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
  }

  if (!err.isOperational && !err.code) {
    console.error(err);
    statusCode = 500;
    message = 'Something went wrong';
  }

  res.status(statusCode).json({
    error: true,
    message,
    statusCode,
  });
}

module.exports = errorHandler;
