import * as Koa from 'koa';
import * as bodyParser from 'koa-bodyparser';
import * as helmet from 'koa-helmet';
import * as cors from '@koa/cors';
import * as winston from 'winston';
import * as dotenv from 'dotenv';
import * as passport from 'koa-passport';
import * as session from 'koa-session';
import { createConnection } from 'typeorm';
import 'reflect-metadata';
import * as PostgressConnectionStringParser from 'pg-connection-string';

import { logger } from './logging';
import { config } from './config';
import { router } from './routes';

import { User } from './entity/user';
import { Item } from './entity/item';

// Load environment variables from .env file, where API keys and passwords are configured
// dotenv.config({ path: '.env' });

// Get DB connection options from env variable
const connectionOptions = PostgressConnectionStringParser.parse(config.databaseUrl);

// create connection with database
// note that its not active database connection
// TypeORM creates you connection pull to uses connections from pull on your requests
createConnection({
  type: 'postgres',
  host: connectionOptions.host,
  port: connectionOptions.port,
  username: connectionOptions.user,
  password: connectionOptions.password,
  database: connectionOptions.database,
  synchronize: true,
  logging: false,
  entities: [
    User,
    Item
  ],
  extra: {
    ssl: config.dbsslconn // if not development, will use SSL
  }
}).then(async (connection) => {

  const app = new Koa();

  app.keys = ['secret'];
  app.use(session({}, app));

  // Provides important security headers to make your app more secure
  app.use(helmet());

  // Enable cors with default options
  app.use(cors());

  // Logger middleware -> use winston as logger (logging.ts with config)
  app.use(logger(winston));

  // Enable bodyParser with default options
  app.use(bodyParser());

  app.use(passport.initialize());
  app.use(passport.session());
  // JWT middleware -> below this line routes are only reached if JWT token
  // is valid, secret as env variable
  // app.use(jwt({ secret: config.jwtSecret }));

  // this routes are protected by the JWT middleware, also include middleware
  // to respond with "Method Not Allowed - 405".
  app.use(router.routes()).use(router.allowedMethods());

  app.listen(config.port);

  console.log(`Server running on port ${config.port}`);

}).catch(error => console.log('TypeORM connection error: ', error));
