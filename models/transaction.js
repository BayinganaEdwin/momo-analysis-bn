'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {}
  }
  Transaction.init(
    {
      transaction_id: DataTypes.STRING,
      date: DataTypes.DATE,
      amount: DataTypes.DECIMAL,
      transaction_type: DataTypes.STRING,
      raw_message: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: 'Transaction',
    },
  );
  return Transaction;
};
