export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Not found' })
}

export function errorHandler(err, _req, res, _next) {
  console.error(err)
  const status = err.status ?? 500
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : (err.message ?? 'Request failed'),
    ...(process.env.NODE_ENV !== 'production' && err.stack && status === 500 ? { stack: err.stack } : {}),
  })
}
