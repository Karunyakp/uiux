export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

/** Express 4 does not catch rejected promises; this forwards them to the error handler. */
export const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export const notFound = (req, res, next) => next(new HttpError(404, 'Not found'))

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err)
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500
  if (status >= 500 && status !== 503) console.error(err)
  const isExposed = status < 500 || status === 503 || err instanceof HttpError
  res.status(status).json({
    error: isExposed ? err.message : 'Internal server error',
    code: err.code,
    ...(err.details ? { details: err.details } : {})
  })
}
