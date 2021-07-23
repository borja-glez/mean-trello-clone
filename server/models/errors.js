class BadRequestError extends Error {
  constructor(error, message) {
    super(message);
    this.error = error;
    this.status = 400;
  }
}

class NotFoundError extends Error {
  constructor(error, message) {
    super(message);
    this.error = error;
    this.status = 404;
  }
}

module.exports = { BadRequestError, NotFoundError };
