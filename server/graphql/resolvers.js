const { AuthenticationError } = require('apollo-server-express');
const { NotFoundError } = require('../models/errors');
const { getUserById, authenticate, register } = require('../routes/api/auth');
const { getBoard, getUserBoards, addBoard, renameBoard, addMember } = require('../routes/api/boards');
const {
  getListCards,
  getCard,
  addCard,
  editCard,
  archiveCard,
  moveCard,
  addRemoveMember,
  deleteCard
} = require('../routes/api/cards');
const { addChecklist, editChecklist, completeChecklist, deleteChecklist } = require('../routes/api/checklists');
const { getBoardLists, getList, addList, renameList, archiveList, moveList } = require('../routes/api/lists');

const checkAuth = async (context) => {
  if (!context.user) {
    throw new AuthenticationError('Token is not valid');
  }
};

const checkMember = async (id, userId) => {
  const board = await Board.findById(id);
  if (!board) {
    throw new NotFoundError({ msg: 'Board not found' });
  }

  const members = board.members.map((member) => member.user);
  if (!members.includes(userId)) {
    throw new AuthenticationError('You must be a member of this board to make changes');
  }
};

const authResolvers = {
  Query: {
    getAuthenticatedUser: async (_, {}, context) => {
      await checkAuth(context);
      console.log(context);
      return await getUserById(context.user.id);
    }
  },
  Mutation: {
    register: async (_, { input }) => {
      const { name, email, password } = input;
      return await register(name, email, password);
    },
    authenticate: async (_, { input }) => {
      const { email, password } = input;
      console.log(input);
      return await authenticate(email, password);
    }
  }
};

const boardsResolvers = {
  Query: {
    getUserBoards: async (_, {}, context) => {
      await checkAuth(context);
      return await getUserBoards(context.user.id);
    },
    getBoard: async (_, { id }, context) => {
      await checkAuth(context);
      return await getBoard(id);
    },
    getBoardActivity: async (_, { id }, context) => {
      await checkAuth(context);
      return await getBoard(id).activity;
    }
  },
  Mutation: {
    addBoard: async (_, { input }, context) => {
      await checkAuth(context);
      const { title, backgroundURL } = input;
      return await addBoard(context.user.id, title, backgroundURL);
    },
    renameBoard: async (_, { input }, context) => {
      await checkAuth(context);
      const { id, title } = input;
      await checkMember(id, context.user.id);
      return await renameBoard(id, context.user.id, title);
    },
    addMember: async (_, { input }, context) => {
      await checkAuth(context);
      const { id, userId } = input;
      await checkMember(id, context.user.id);
      return await addMember(id, userId);
    }
  }
};

const listsResolvers = {
  Query: {
    getBoardLists: async (_, { boardId }, context) => {
      await checkAuth(context);
      return await getBoardLists(boardId);
    },
    getList: async (_, { id }, context) => {
      await checkAuth(context);
      return await getList(id);
    }
  },
  Mutation: {
    addList: async (_, { input }, context) => {
      await checkAuth(context);
      const { boardId, title } = input;
      await checkMember(boardId, context.user.id);
      return await addList(boardId, context.user.id, title);
    },
    renameList: async (_, { input }, context) => {
      await checkAuth(context);
      const { id, boardId, title } = input;
      await checkMember(boardId, context.user.id);
      return await renameList(boardId, id, context.user.id, title);
    },
    archiveList: async (_, { input }, context) => {
      await checkAuth(context);
      const { id, boardId, archive } = input;
      await checkMember(boardId, context.user.id);
      return await archiveList(boardId, id, context.user.id, archive);
    },
    moveList: async (_, { input }, context) => {
      await checkAuth(context);
      const { id, boardId, index } = input;
      await checkMember(boardId, context.user.id);
      return await moveList(boardId, id, context.user.id, index);
    }
  }
};

const cardsResolvers = {
  Query: {
    getListCards: async (_, { listId }, context) => {
      await checkAuth(context);
      return await getListCards(listId);
    },
    getCard: async (_, { id }, context) => {
      await checkAuth(context);
      return await getCard(id);
    }
  },
  Mutation: {
    addCard: async (_, { input }, context) => {
      await checkAuth(context);
      const { boardId, listId, title } = input;
      await checkMember(boardId, context.user.id);
      return await addCard(context.user.id, boarrdId, listId, title);
    },
    editCard: async (_, { input }, context) => {
      await checkAuth(context);
      const { boardId, cardId } = input;
      await checkMember(boardId, context.user.id);
      return await editCard(cardId, input);
    },
    archiveCard: async (_, { input }, context) => {
      await checkAuth(context);
      const { boardId, cardId, archive } = input;
      await checkMember(boardId, context.user.id);
      return await archiveCard(context.user.id, boardId, cardId, archive);
    },
    moveCard: async (_, { input }, context) => {
      await checkAuth(context);
      const { boardId, cardId, fromId, toId, toIndex } = input;
      await checkMember(boardId, context.user.id);
      return await moveCard(context.user.id, boardId, cardId, fromId, toId, toIndex);
    },
    addCardMember: async (_, { input }, context) => {
      await checkAuth(context);
      const { boardId, cardId, userId } = input;
      await checkMember(boardId, context.user.id);
      return await addRemoveMember(userId, boardId, cardId, true);
    },
    removeCardMember: async (_, { input }, context) => {
      await checkAuth(context);
      const { boardId, cardId, userId } = input;
      await checkMember(boardId, context.user.id);
      return await addRemoveMember(userId, boardId, cardId, false);
    },
    deleteCard: async (_, { input }, context) => {
      await checkAuth(context);
      const { boardId, cardId, listId } = input;
      await checkMember(boardId, context.user.id);
      return await deleteCard(context.user.id, boardId, listId, cardId);
    }
  }
};

const checklistsResolvers = {
  Mutation: {
    addChecklist: async (_, { input }, context) => {
      await checkAuth(context);
      const { boardId, cardId, text } = input;
      await checkMember(boardId, context.user.id);
      return await addChecklist(cardId, text);
    },
    editChecklist: async (_, { input }, context) => {
      await checkAuth(context);
      const { boardId, cardId, itemId, text } = input;
      await checkMember(boardId, context.user.id);
      return await editChecklist(cardId, itemId, text);
    },
    completeChecklist: async (_, { input }, context) => {
      await checkAuth(context);
      const { boardId, cardId, itemId, complete } = input;
      await checkMember(boardId, context.user.id);
      return await completeChecklist(cardId, itemId, complete);
    },
    deleteChecklist: async (_, { input }, context) => {
      await checkAuth(context);
      const { boardId, cardId, itemId } = input;
      await checkMember(boardId, context.user.id);
      return await deleteChecklist(cardId, itemId);
    }
  }
};

const resolvers = [authResolvers, boardsResolvers, listsResolvers, cardsResolvers, checklistsResolvers];

module.exports = resolvers;
