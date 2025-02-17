require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize } = require('sequelize');
const transactionRoutes = require('./routes/transaction.routes');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false,
  },
);

async function ensureDatabaseExists() {
  const rootSequelize = new Sequelize(
    'postgres',
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      dialect: 'postgres',
      logging: false,
    },
  );

  try {
    await rootSequelize.query(`CREATE DATABASE ${process.env.DB_NAME}`);
    console.log(`Database ${process.env.DB_NAME} created successfully.`);
  } catch (error) {
    if (error.original && error.original.code === '42P04') {
      console.log(`Database ${process.env.DB_NAME} already exists.`);
    } else {
      console.error('Error creating database:', error);
    }
  } finally {
    await rootSequelize.close();
  }
}

const app = express();

app.use(bodyParser.json());

app.use('/api/transactions', transactionRoutes);

ensureDatabaseExists().then(() => {
  sequelize
    .sync()
    .then(() => {
      console.log('Database synced ✅');
      app.listen(process.env.PORT || 9000, () => {
        console.log(`Server running on port ${process.env.PORT || 9000} 🍀`);
      });
    })
    .catch((err) => console.error('Error syncing database:', err));
});
