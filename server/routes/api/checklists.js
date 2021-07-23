const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const member = require('../../middleware/member');
const { check, validationResult } = require('express-validator');

const Card = require('../../models/Card');
const { NotFoundError } = require('../../models/errors');

const addChecklist = async (cardId, text) => {
  const card = await Card.findById(cardId);
  if (!card) {
    throw new NotFoundError({ msg: 'Card not found' });
  }

  card.checklist.push({ text, complete: false });
  return await card.save();
};

const editChecklist = async (cardId, itemId, text) => {
  const card = await Card.findById(cardId);
  if (!card) {
    throw new NotFoundError({ msg: 'Card not found' });
  }

  card.checklist.find((item) => item.id === itemId).text = text;
  return await card.save();
};

const completeChecklist = async (cardId, itemId, complete) => {
  const card = await Card.findById(cardId);
  if (!card) {
    throw new NotFoundError({ msg: 'Card not found' });
  }

  card.checklist.find((item) => item.id === itemId).complete = complete;
  return await card.save();
};

const deleteChecklist = async (cardId, itemId) => {
  const card = await Card.findById(cardId);
  if (!card) {
    throw new NotFoundError({ msg: 'Card not found' });
  }

  const index = card.checklist.findIndex((item) => item.id === itemId);
  if (index !== -1) {
    card.checklist.splice(index, 1);
    await card.save();
  }

  return card;
};

// Add a checklist item
router.post('/:cardId', [auth, member, [check('text', 'Text is required').not().isEmpty()]], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    res.json(await addChecklist(req.params.cardId, req.body.text));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Edit a checklist's item's text
router.patch(
  '/:cardId/:itemId',
  [auth, member, [check('text', 'Text is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      res.json(await editChecklist(req.params.cardId, req.params.itemId, req.body.text));
    } catch (err) {
      if (err instanceof NotFoundError) {
        return res.status(err.status).json(err.error);
      }
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// Complete/Uncomplete a checklist item
router.patch('/:cardId/:itemId', [auth, member], async (req, res) => {
  try {
    res.json(await completeChecklist(req.params.cardId, req.params.itemId, req.query.complete === 'true'));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Delete a checklist item
router.delete('/:cardId/:itemId', [auth, member], async (req, res) => {
  try {
    res.json(await deleteChecklist(req.params.cardId, req.params.itemid));
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(err.status).json(err.error);
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = {
  addChecklist,
  editChecklist,
  completeChecklist,
  deleteChecklist,
  router
};
