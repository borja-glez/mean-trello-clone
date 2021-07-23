const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type User {
    name: String
    email: String
    avatar: String
    boards: [Board]
  }

  type Board {
    title: String
    lists: [List]
    activity: [BoardActivity]
    backgroundURL: String
    members: [BoardMember]
  }

  type List {
    title: String
    cards: [Card]
    archived: Boolean
  }

  type Card {
    title: String
    description: String
    tags: [String]
    members: [BoardMember]
    checklist: [Checklist]
    archived: Boolean
  }

  type BoardActivity {
    text: String
    date: String
  }

  type BoardMember {
    user: User
    name: String
    role: String
  }

  type Checklist {
    text: String
    complete: Boolean
  }

  type Token {
    access_token: String
  }

  # Auth
  input RegisterInput {
    name: String!
    email: String!
    password: String!
  }

  input AuthenticateInput {
    email: String!
    password: String!
  }

  # Boards
  input AddBoardInput {
    title: String!
    backgroundURL: String
  }

  input RenameBoardInput {
    id: ID!
    title: String!
  }

  input AddMemberInput {
    id: ID!
    userId: ID!
  }

  # Lists
  input AddListInput {
    boardId: ID!
    title: String!
  }

  input RenameListInput {
    boardId: ID!
    id: ID!
    title: String!
  }

  input ArchiveListInput {
    boardId: ID!
    id: ID!
    archive: Boolean!
  }

  input MoveListInput {
    boardId: ID!
    id: ID!
    index: Int
  }

  # Cards
  type MoveCard {
    cardId: ID
    from: Card
    to: Card
  }

  input AddCardInput {
    boardId: ID!
    listId: ID!
    title: String!
  }

  input EditCardInput {
    boardId: ID!
    cardId: ID!
    title: String!
    description: String
    tags: [String]
  }

  input ArchiveCardInput {
    boardId: ID!
    cardId: ID!
    archive: Boolean!
  }

  input MoveCardInput {
    boardId: ID!
    cardId: ID!
    fromId: ID!
    toId: ID!
    toIndex: ID!
  }

  input AddRemoveCardMemberInput {
    boardId: ID!
    cardId: ID!
    userId: ID!
  }

  input DeleteCardInput {
    boardId: ID!
    listId: ID!
    cardId: ID!
  }

  # Checklists
  input AddChecklistInput {
    boardId: ID!
    cardId: ID!
    text: String!
  }

  input EditChecklistInput {
    boardId: ID!
    cardId: ID!
    itemId: ID!
    text: String!
  }

  input CompleteChecklistInput {
    boardId: ID!
    cardId: ID!
    itemId: ID!
    complete: Boolean!
  }

  input DeleteChecklistInput {
    boardId: ID!
    cardId: ID!
    itemId: ID!
  }

  # Query
  type Query {
    # Auth
    getAuthenticatedUser: User

    # Boards
    getUserBoards: [Board]
    getBoard(id: ID): Board
    getBoardActivity(id: ID): [BoardActivity]

    # Lists
    getBoardLists(boardId: ID): [List]
    getList(id: ID): List

    # Cards
    getListCards(listId: ID): [Card]
    getCard(id: ID): Card
  }

  # Mutation
  type Mutation {
    # Auth
    register(input: RegisterInput): Token
    authenticate(input: AuthenticateInput): Token

    # Boards
    addBoard(input: AddBoardInput): Board
    renameBoard(input: RenameBoardInput): Board
    addMember(input: AddMemberInput): [BoardMember]

    # Lists
    addList(input: AddListInput): List
    renameList(input: RenameListInput): List
    archiveList(input: ArchiveListInput): List
    moveList(input: MoveListInput): [List]

    # Cards
    addCard(input: AddCardInput): Card
    editCard(input: EditCardInput): Card
    archiveCard(input: ArchiveCardInput): Card
    moveCard(input: MoveCardInput): MoveCard
    addCardMember(input: AddRemoveCardMemberInput): Card
    removeCardMember(input: AddRemoveCardMemberInput): Card
    deleteCard(input: DeleteCardInput): ID

    # Checklists
    addChecklist(input: AddChecklistInput): Card
    editChecklist(input: EditChecklistInput): Card
    completeChecklist(input: CompleteChecklistInput): Card
    deleteChecklist(input: DeleteChecklistInput): Card
  }
`;

module.exports = typeDefs;
