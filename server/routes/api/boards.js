const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const member = require('../../middleware/member');
const { check, validationResult } = require('express-validator');

const User = require('../../models/User');
const Board = require('../../models/Board');

const { BadRequestError, NotFoundError } = require('../../models/errors');

const addBoard = async (userId, title, backgroundURL) => {
  // Create and save the board
  const newBoard = new Board({ title, backgroundURL });
  const board = await newBoard.save();

  // Add board to user's boards
  const user = await User.findById(userId);
  user.boards.unshift(board.id);
  await user.save();

  // Add user to board's members as admin
  board.members.push({ user: user.id, name: user.name });

  // Log activity
  board.activity.unshift({
    text: `${user.name} created this board`
  });
  await board.save();

  return board;
};

const getUserBoards = async (userId) => {
  const user = await User.findById(userId);

  const boards = [];
  for await (const boardId of user.boards) {
    boards.push(await Board.findById(boardId));
  }

  return boards;
};

const getBoard = async (id) => {
  const board = await Board.findById(id);
  if (!board) {
    throw new NotFoundError({ msg: 'Board not found' });
  }

  return board;
};

const renameBoard = async (id, userId, title) => {
  const board = await getBoard(id);

  // Log activity
  if (title !== board.title) {
    const user = await User.findById(userId);
    board.activity.unshift({
      text: `${user.name} renamed this board (from '${board.title}')`
    });
  }

  board.title = title;
  await board.save();

  return board;
};

const addMember = async (id, userId) => {
  const board = await getBoard(id);
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError({ msg: 'User not found' });
  }

  // See if already member of board
  if (board.members.map((member) => member.user).includes(userId)) {
    throw new BadRequestError({ msg: 'Already member of board' });
  }

  // Add board to user's boards
  user.boards.unshift(board.id);
  await user.save();

  // Add user to board's members with 'normal' role
  board.members.push({ user: user.id, name: user.name, role: 'normal' });

  // Log activity
  board.activity.unshift({
    text: `${user.name} joined this board`
  });
  await board.save();

  return board.members;
};

// Add a board
router.post('/', [auth, [check('title', 'Title is required').not().isEmpty()]], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, backgroundURL } = req.body;
    res.json(await addBoard(req.user.id, title, backgroundURL));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get user's boards
router.get('/', auth, async (req, res) => {
  try {
    res.json(await getUserBoards(req.user.id));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get a board by id
router.get('/:id', auth, async (req, res) => {
  try {
    res.json(await getBoard(req.params.id));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get a board's activity
router.get(':id/activity', auth, async (req, res) => {
  try {
    res.json(await getBoard(req.params.id).activity);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Change a board's title
router.patch('/rename', [auth, member, [check('title', 'Title is required').not().isEmpty()]], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    res.json(await renameBoard(req.header('boardId'), req.user.id, req.body.title));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Add a board member
router.put('/addMember/:userId', [auth, member], async (req, res) => {
  try {
    res.json(await addMember(req.header('boardId'), req.params.userId));
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(err.status).json(err.error);
    }
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = {
  addBoard,
  getUserBoards,
  getBoard,
  renameBoard,
  addMember,
  router
};
