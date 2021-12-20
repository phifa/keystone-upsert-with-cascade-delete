import { config, graphQLSchemaExtension } from '@keystone-6/core';

// Look in the schema file for how we define our lists, and how users interact with them through graphql or the Admin UI
import { lists } from './schema';
import express from 'express';
import { Request, Response, NextFunction } from 'express';

// Keystone auth is configured separately - check out the basic auth setup we are importing from our auth file.
import { withAuth, session } from './auth';
import { upsertSamples } from './upsertSamples';
import { main } from './test';
import { KeystoneContext } from '@keystone-6/core/types';

const gql = String.raw;

export default // Using the config function helps typescript guide you to the available options.
config({
  // the db sets the database provider - we're using sqlite for the fastest startup experience
  db: {
    provider: 'sqlite',
    url: 'file:./keystone.db',
  },
  // This config allows us to set up features of the Admin UI https://keystonejs.com/docs/apis/config#ui
  ui: {
    // For our starter, we check that someone has session data before letting them see the Admin UI.
    isAccessAllowed: (context) => !!context.session?.data,
  },
  lists,
  session,
  server: {
    port: 4444,
    extendExpressApp: (app, createContext) => {
      // make sure to import express
      app.use(express.json({ limit: '100mb' }));

      // add context to request
      app.use('/api', async (req, res, next) => {
        let context = (await createContext(req, res)) as KeystoneContext;
        (req as any).context = context;
        next();
      });

      // Endpoint to trigger test
      app.post(
        '/api/rest/test',
        async (req: Request, res: Response, next: NextFunction) => {
          const context = (req as any).context as KeystoneContext;
          const result = main(context, 1000);
          // console.log(result);
          return res.status(200).send('doin it');
        }
      );
    },
  },
  extendGraphqlSchema: graphQLSchemaExtension({
    typeDefs: gql`
      type Mutation {
        """
        Upsert samples
        """
        upsertSamples(upsertArgs: [SampleUpdateArgs!]!): [Sample]
      }
    `,
    resolvers: {
      Mutation: {
        upsertSamples,
      },
      Query: {},
    },
  }),
});
