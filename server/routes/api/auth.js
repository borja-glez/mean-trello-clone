const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../../middleware/auth');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const gravatar = require('gravatar');
const config = require('config');

const User = require('../../models/User');
const { BadRequestError } = require('../../models/errors');

const token = (user) => {
  const { id, name, email } = user;
  return jwt.sign({ id, name, email }, config.get('jwt_secret'), { expiresIn: 360000 });
};

const getUserById = async (id) => {
  return await User.findById(id).select('-password');
};

const getUserByEmail = async (email) => {
  return await User.findOne({ email });
};

// Authenticate user & get token
const authenticate = async (email, password) => {
  // See if user exists
  const user = await getUserByEmail(email);
  if (!user) {
    throw new BadRequestError({
      errors: [{ msg: 'Invalid credentials' }]
    });
  }

  // Check for email and password match
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new BadRequestError({
      errors: [{ msg: 'Invalid credentials' }]
    });
  }

  // Return jsonwebtoken
  return { access_token: token(user, 360000) };
};

// Register user
const register = async (name, email, password) => {
  // See if user exists
  if (await getUserByEmail(email)) {
    throw new BadRequestError({ errors: [{ msg: 'User already exists' }] });
  }

  // Register new user
  const user = new User({
    name,
    email,
    avatar: gravatar.url(email, { s: '200', r: 'pg', d: 'mm' }),
    password: await bcrypt.hash(password, await bcrypt.genSalt(10))
  });

  await user.save();

  // Return jsonwebtoken
  return { access_token: token(user) };
};

// Get authorized user
router.get('/', auth, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get authorized user
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Authenticate user & get token
router.post(
  '/',
  [check('email', 'Email is invalid').isEmail(), check('password', 'Password is required').exists()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      res.json(await authenticate(email, password));
    } catch (err) {
      if (err instanceof BadRequestError) {
        return res.status(err.status).json(err.error);
      }
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// Register user
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({
      min: 6
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      // Return jsonwebtoken
      res.json(await register(name, email, password));
    } catch (err) {
      if (err instanceof BadRequestError) {
        return res.status(err.status).json(err.error);
      }
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = {
  token,
  getUserById,
  getUserByEmail,
  authenticate,
  register,
  router
};
