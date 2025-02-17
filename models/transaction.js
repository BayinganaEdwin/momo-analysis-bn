'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {}
  Transaction.init(
    {
      transaction_id: DataTypes.STRING,
      date: DataTypes.DATE,
      amount: DataTypes.STRING,
      transaction_type: DataTypes.STRING,
      raw_message: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'Transaction',
      tableName: 'Transactions',
      freezeTableName: true,
    },
  );
  return Transaction;
};
