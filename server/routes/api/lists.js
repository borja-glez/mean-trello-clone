const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const member = require('../../middleware/member');
const { check, validationResult } = require('express-validator');

const User = require('../../models/User');
const Board = require('../../models/Board');
const List = require('../../models/List');
const { NotFoundError } = require('../../models/errors');

const addList = async (boardId, userId, title) => {
  // Create and save the list
  const newList = new List({ title });
  const list = await newList.save();

  // Assign the list to the board
  const board = await Board.findById(boardId);
  board.lists.push(list.id);

  // Log activity
  const user = await User.findById(userId);
  board.activity.unshift({
    text: `${user.name} added '${title}' to this board`
  });
  await board.save();

  return list;
};

const getBoardLists = async (boardId) => {
  const board = await Board.findById(boardId);
  if (!board) {
    throw new NotFoundError({ msg: 'Board not found' });
  }

  const lists = [];
  for await (const listId of board.lists) {
    lists.push(await List.findById(listId));
  }

  return lists;
};

const getList = async (id) => {
  const list = await List.findById(id);
  if (!list) {
    throw new NotFoundError({ msg: 'List not found' });
  }
  return list;
};

const renameList = async (boardId, id, userId, title) => {
  const list = await getList(id);
  list.title = title;
  await list.save();

  // Log activity
  const user = await User.findById(userId);
  const board = await Board.findById(boardId);

  board.activity.unshift({
    text: `${user.name} renamed list '${list.title}'`
  });

  return list;
};

const archiveList = async (boardId, id, userId, archived) => {
  const list = await getList(id);
  list.archived = archived;
  await list.save();

  // Log activity
  const user = await User.findById(userId);
  const board = await Board.findById(boardId);
  board.activity.unshift({
    text: list.archived
      ? `${user.name} archived list '${list.title}'`
      : `${user.name} sent list '${list.title}' to the board`
  });
  await board.save();

  return list;
};

const moveList = async (boardId, id, userId, index) => {
  const toIndex = index ? index : 0;
  const user = await User.findById(userId);
  const board = await Board.findById(boardId);
  board.lists.splice(board.lists.indexOf(id), 1);
  board.lists.splice(toIndex, 0, id);
  board.activity.unshift({
    text: `${user.name} moved list '${list.title}' to index ${toIndex}`
  });
  await board.save();
  return board.lists;
};

// Add a list
router.post('/', [auth, member, [check('title', 'Title is required').not().isEmpty()]], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    res.json(await addList(req.header('boardId'), req.user.id, req.body.title));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get all of a board's lists
router.get('/boardLists', auth, async (req, res) => {
  try {
    res.json(await getBoardLists(req.header('boardId')));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get a list by id
router.get('/:id', auth, async (req, res) => {
  try {
    res.json(await getList(req.params.id));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Edit a list's title
router.patch('/rename/:id', [auth, member, [check('title', 'Title is required').not().isEmpty()]], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    res.json(await renameList(req.header('boardId'), req.params.id, req.user.id));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Archive/Unarchive a list
router.patch('/archive/:id', [auth, member], async (req, res) => {
  try {
    res.json(await archiveList(req.header('boardId'), req.params.id, req.user.id, req.query.archive === 'true'));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Move a list
router.patch('/move/:id', [auth, member], async (req, res) => {
  try {
    res.send(await moveList(req.header('boardId'), req.params.id, req.user.id, req.body.toIndex));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = {
  addList,
  getBoardLists,
  getList,
  renameList,
  archiveList,
  moveList,
  router
};
