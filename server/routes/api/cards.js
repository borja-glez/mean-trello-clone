const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const member = require('../../middleware/member');
const { check, validationResult } = require('express-validator');

const User = require('../../models/User');
const Board = require('../../models/Board');
const List = require('../../models/List');
const Card = require('../../models/Card');
const { NotFoundError, BadRequestError } = require('../../models/errors');

const addCard = async (userId, boardId, listId, title) => {
  // Create and save the card
  const newCard = new Card({ title });
  const card = await newCard.save();

  // Assign the card to the list
  const list = await List.findById(listId);
  list.cards.push(card.id);
  await list.save();

  // Log activity
  const user = await User.findById(userId);
  const board = await Board.findById(boardId);
  board.activity.unshift({
    text: `${user.name} added '${title}' to '${list.title}'`
  });
  await board.save();

  return { cardId: card.id, listId };
};

const getListCards = async (listId) => {
  const list = await List.findById(listId);
  if (!list) {
    throw new NotFoundError({ msg: 'List not found' });
  }

  const cards = [];
  for await (const cardId of list.cards) {
    cards.push(await List.findById(cardId));
  }

  return cards;
};

const getCard = async (id) => {
  const card = await Card.findById(id);
  if (!card) {
    throw new NotFoundError({ msg: 'Card not found' });
  }
  return card;
};

const editCard = async (cardId, data) => {
  const { title, description, tags } = data;

  if (title === '') {
    throw new BadRequestError({ msg: 'Title is required' });
  }

  const card = await getCard(cardId);

  card.title = title ? title : card.title;
  if (description || description === '') {
    card.description = description;
  }
  if (tags) {
    card.tags = tags;
  }

  return await card.save();
};

const archiveCard = async (userId, boardId, cardId, archive) => {
  const card = await getCard(cardId);
  card.archived = archive;
  await card.save();

  // Log activity
  const user = await User.findById(userId);
  const board = await Board.findById(boardId);
  board.activity.unshift({
    text: card.archived
      ? `${user.name} archived card '${card.title}'`
      : `${user.name} sent card '${card.title}' to the board`
  });
  await board.save();

  return card;
};

const moveCard = async (userId, boardId, cardId, fromId, toId, toIndex) => {
  const from = await List.findById(fromId);
  let to = await List.findById(toId);
  if (!cardId || !from || !to) {
    throw new NotFoundError({ msg: 'List/card not found' });
  } else if (fromId === toId) {
    to = from;
  }

  const fromIndex = from.cards.indexOf(cardId);
  if (fromIndex !== -1) {
    from.cards.splice(fromIndex, 1);
    await from.save();
  }

  if (!to.cards.includes(cardId)) {
    if (toIndex === 0 || toIndex) {
      to.cards.splice(toIndex, 0, cardId);
    } else {
      to.cards.push(cardId);
    }
    await to.save();
  }

  // Log activity
  if (fromId !== toId) {
    const user = await User.findById(userId);
    const board = await Board.findById(boardId);
    const card = await Card.findById(cardId);
    board.activity.unshift({
      text: `${user.name} moved '${card.title}' from '${from.title}' to '${to.title}'`
    });
    await board.save();
  }

  return { cardId, from, to };
};

const addRemoveMember = async (userId, boardId, cardId, add) => {
  const card = await Card.findById(cardId);
  const user = await User.findById(userId);
  if (!card || !user) {
    throw new NotFoundError({ msg: 'Card/user not found' });
  }

  const members = card.members.map((member) => member.user);
  const index = members.indexOf(userId);
  if ((add && members.includes(userId)) || (!add && index === -1)) {
    return res.json(card);
  }

  if (add) {
    card.members.push({ user: user.id, name: user.name });
  } else {
    card.members.splice(index, 1);
  }
  await card.save();

  // Log activity
  const board = await Board.findById(boardId);
  board.activity.unshift({
    text: `${user.name} ${add ? 'joined' : 'left'} '${card.title}'`
  });
  await board.save();

  return card;
};

const deleteCard = async (userId, boardId, listId, cardId) => {
  const card = await Card.findById(cardId);
  const list = await List.findById(listId);
  if (!card || !list) {
    throw new NotFoundError({ msg: 'List/card not found' });
  }

  list.cards.splice(list.cards.indexOf(cardId), 1);
  await list.save();
  await card.remove();

  // Log activity
  const user = await User.findById(userId);
  const board = await Board.findById(boardId);
  board.activity.unshift({
    text: `${user.name} deleted '${card.title}' from '${list.title}'`
  });
  await board.save();

  return cardId;
};

// Add a card
router.post('/', [auth, member, [check('title', 'Title is required').not().isEmpty()]], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, listId } = req.body;
    res.json(await addCard(req.user.id, req.header('boardId'), listId, title));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get all of a list's cards
router.get('/listCards/:listId', auth, async (req, res) => {
  try {
    res.json(await getListCards(req.params.listId));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get a card by id
router.get('/:id', auth, async (req, res) => {
  try {
    res.json(await getCard(req.params.id));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Edit a card's title, description, and/or tags
router.patch('/edit/:id', [auth, member], async (req, res) => {
  try {
    res.json(await editCard(req.params.id, req.body));
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof BadRequestError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Archive/Unarchive a card
router.patch('/archive/:id', [auth, member], async (req, res) => {
  try {
    res.json(await archiveCard(req.user.id, req.header('boardId'), req.params.id, req.query.archive === 'true'));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Move a card
router.patch('/move/:id', [auth, member], async (req, res) => {
  try {
    const { fromId, toId, toIndex } = req.body;
    res.send(await moveCard(req.user.id, req.header('boardId'), req.params.id, fromId, toId, toIndex));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Add/Remove a member
router.put('/addMember/:id/:userId', [auth, member], async (req, res) => {
  try {
    const { id, userId } = req.params;
    res.json(await addRemoveMember(userId, req.header('boardId'), id, req.query.add === 'true'));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Delete a card
router.delete('/:listId/:id', [auth, member], async (req, res) => {
  try {
    res.json(await deleteCard(req.user.id, req.header('boardId'), req.params.listId, req.params.id));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = {
  addCard,
  getListCards,
  getCard,
  editCard,
  archiveCard,
  moveCard,
  addRemoveMember,
  deleteCard,
  router
};
