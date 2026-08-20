/**
 * Validate and normalize the payload for POST /users before it reaches the controller.
 *
 * The middleware deliberately uses manual validation so each assignment rule is
 * visible and easy to audit. Invalid requests are stopped at the route boundary;
 * valid requests receive a normalized username and email through req.body.
 */
function validateUser(req, res, next) {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? req.body
    : {};

  // R08 and R09: normalize the fields before checking their content.
  if (typeof body.username === 'string') {
    body.username = body.username.trim();
  }
  if (typeof body.email === 'string') {
    body.email = body.email.trim().toLowerCase();
  }
  req.body = body;

  const errors = [];
  const isMissing = (value) => value === undefined || value === null || value === '';

  // R01: all required fields must be present.
  for (const field of ['username', 'email', 'password', 'age', 'role']) {
    if (isMissing(body[field])) {
      errors.push(`R01: ${field} is required`);
    }
  }

  // R02: username length and password minimum length.
  if (typeof body.username === 'string' && body.username.length > 0) {
    if (body.username.length < 3 || body.username.length > 30) {
      errors.push('R02: username must be between 3 and 30 characters');
    }
  }
  if (typeof body.password === 'string' && body.password.length > 0 && body.password.length < 6) {
    errors.push('R02: password must be at least 6 characters');
  }

  // R03: basic email format validation.
  if (typeof body.email === 'string' && body.email.length > 0) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(body.email)) {
      errors.push('R03: email must be a valid email address');
    }
  }

  // R04 and R05: age must be a finite number of at least 18.
  if (!isMissing(body.age) && (typeof body.age !== 'number' || !Number.isFinite(body.age))) {
    errors.push('R04: age must be a number');
  } else if (typeof body.age === 'number' && Number.isFinite(body.age) && body.age < 18) {
    errors.push('R05: age must be at least 18');
  }

  // R06: role is restricted to the two supported values.
  if (!isMissing(body.role) && !['user', 'admin'].includes(body.role)) {
    errors.push('R06: role must be either "user" or "admin"');
  }

  // R07: website is optional, but a supplied value must be an HTTP(S) URL.
  if (!isMissing(body.website)) {
    let validWebsite = false;
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      try {
        const website = new URL(body.website);
        validWebsite = website.protocol === 'http:' || website.protocol === 'https:';
      } catch (error) {
        validWebsite = false;
      }
    }
    if (!validWebsite) {
      errors.push('R07: website must be a valid URL');
    }
  }

  // R10: passwords must contain both a letter and a number.
  if (typeof body.password === 'string' && body.password.length > 0) {
    if (!/[A-Za-z]/.test(body.password) || !/\d/.test(body.password)) {
      errors.push('R10: password must contain at least one letter and one number');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
    });
  }

  next();
}

module.exports = validateUser;

