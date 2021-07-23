const express = require('express');
const morganMiddleware = require('./middleware/morgan');
const connectDB = require('./config/db');
const { ApolloServer } = require('apollo-server-express');
const jwt = require('jsonwebtoken');
const config = require('config');
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');

const startApolloServer = async (typeDefs, resolvers) => {
  // Init Apollo Graphql server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      const token = req.headers['authorization'] || '';
      if (token) {
        try {
          const user = jwt.verify(token.replace('Bearer ', ''), config.get('jwt_secret'));
          return {
            user
          };
        } catch (error) {
          console.log(error);
        }
      }
    }
  });

  await server.start();
  const app = express();

  server.applyMiddleware({ app });

  // Connect to Database
  await connectDB();

  app.use(express.json());

  // Middlewares
  app.use(morganMiddleware);

  // API Routes
  app.use('/api/auth', require('./routes/api/auth').router);
  app.use('/api/boards', require('./routes/api/boards').router);
  app.use('/api/lists', require('./routes/api/lists').router);
  app.use('/api/cards', require('./routes/api/cards').router);
  app.use('/api/checklists', require('./routes/api/checklists').router);

  const port = process.env.port || 3000;

  app.listen(port, () => console.log(`Server started on port ${port}`));
};

startApolloServer(typeDefs, resolvers);
