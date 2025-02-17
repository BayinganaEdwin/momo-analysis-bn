const { Transaction } = require('../models');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { Op } = require('sequelize');
const sequelize = require('../models').sequelize;

exports.getAllTransactions = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 25;
    const offset = (pageNumber - 1) * pageSize;

    let transactions = [];

    if (pageNumber && limit) {
      transactions = await Transaction.findAndCountAll({
        limit: pageSize,
        offset: offset,
      });
    } else {
      transactions = await Transaction.findAll();
    }

    if (transactions.count === 0) {
      return res.status(404).json({ error: 'No transactions found' });
    }

    if (pageNumber && limit) {
      return res.status(200).json({
        message: 'Transactions retrieved successfully',
        total_count: transactions.count,
        total_pages: Math.ceil(transactions.count / pageSize),
        current_page: pageNumber,
        page_size: pageSize,
        data: transactions.rows,
      });
    }

    return res.status(200).json({
      message: 'Transactions retrieved successfully',
      total_count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Internal Server Error', details: error.message });
  }
};

function extractAmount(amountString) {
  if (!amountString) return null;
  return parseFloat(amountString.replace(/,/g, '').replace(/\s*RWF/, ''));
}

function extractAmount(amountString) {
  if (!amountString) return null;
  return parseFloat(amountString.replace(/,/g, '').replace(/\s*RWF/, ''));
}

exports.importTransactionsFromXML = async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../data/modified_sms_v2.xml');

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'File not found', path: filePath });
    }

    const xmlData = fs.readFileSync(filePath, 'utf-8');
    const parser = new xml2js.Parser();

    parser.parseString(xmlData, async (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: 'Error parsing XML', details: err.message });
      }

      const smsList = result.smses.sms;
      let insertedCount = 0;

      for (const sms of smsList) {
        const body = sms.$.body || null;
        const transaction_id =
          body && body.match(/TxId:\s*(\d+)/)
            ? body.match(/TxId:\s*(\d+)/)[1]
            : null;
        const date = sms.$.date
          ? new Date(parseInt(sms.$.date)).toISOString()
          : null;
        let amountMatch = body
          ? body.match(/(\d{1,3}(?:,\d{3})*\s*RWF)/)
          : null;
        const amount = extractAmount(amountMatch ? amountMatch[1] : null);
        const transaction_type = body ? categorizeTransaction(body) : null;

        await Transaction.create({
          transaction_id,
          date,
          amount,
          transaction_type,
          raw_message: body,
        });
        insertedCount++;
      }

      res.status(200).json({
        message: 'XML Data processed',
        inserted: insertedCount,
      });
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Internal Server Error', details: error.message });
  }
};

function categorizeTransaction(body) {
  if (body.includes('You have received')) return 'Incoming Money';
  if (body.includes('Your payment of') && body.includes('has been completed'))
    return 'Payments to Code Holders';
  if (body.includes('transferred to') || body.includes('sent to'))
    return 'Transfers to Mobile Numbers';
  if (body.includes('A bank deposit of') && body.includes('has been added'))
    return 'Bank Deposits';
  if (body.includes('Your airtime purchase of')) return 'Airtime Bill Payments';
  if (body.includes('Cash Power bill payment'))
    return 'Cash Power Bill Payments';
  if (body.includes('initiated by a third party'))
    return 'Transactions Initiated by Third Parties';
  if (body.includes('You have withdrawn')) return 'Withdrawals from Agents';
  if (body.includes('Bank transfer of')) return 'Bank Transfers';
  if (body.includes('Your bundle purchase of'))
    return 'Internet and Voice Bundle Purchases';
  return 'Other';
}

exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.status(200).json(transaction);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Internal Server Error', details: error.message });
  }
};

exports.searchTransactions = async (req, res) => {
  try {
    const { searchTerm, page, limit } = req.query;
    if (!searchTerm) {
      return res.status(400).json({ error: 'searchTerm is required' });
    }

    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 25;
    const offset = (pageNumber - 1) * pageSize;

    const whereCondition = {
      [Op.or]: [
        { transaction_type: { [Op.iLike]: `%${searchTerm}%` } },
        { raw_message: { [Op.iLike]: `%${searchTerm}%` } },
      ],
    };

    let transactions = [];

    if (pageNumber && limit) {
      transactions = await Transaction.findAndCountAll({
        where: whereCondition,
        limit: limit ? pageSize : null,
        offset: limit ? offset : null,
      });
    } else {
      transactions = await Transaction.findAll({
        where: whereCondition,
      });
    }

    if (transactions.count === 0) {
      return res
        .status(404)
        .json({ error: `No transactions found for ${searchTerm}.` });
    }

    if (limit && pageSize) {
      return res.status(200).json({
        message: `Search results for ${searchTerm} retrieved successfully`,
        total_count: transactions.count,
        total_pages: limit ? Math.ceil(transactions.count / pageSize) : 1,
        current_page: limit ? pageNumber : 1,
        page_size: limit ? pageSize : transactions.count,
        data: transactions.rows,
      });
    }

    res.status(200).json({
      message: `Search results for ${searchTerm} retrieved successfully`,
      total_count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Internal Server Error', details: error.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const totalTransactions = await Transaction.count();
    const totalAmount = await Transaction.sum('amount');

    const transactionTypes = [
      'Incoming Money',
      'Payments to Code Holders',
      'Transfers to Mobile Numbers',
      'Bank Deposits',
      'Airtime Bill Payments',
      'Cash Power Bill Payments',
      'Transactions Initiated by Third Parties',
      'Withdrawals from Agents',
      'Bank Transfers',
      'Internet and Voice Bundle Purchases',
    ];

    const categorizedCounts = {};
    for (const type of transactionTypes) {
      categorizedCounts[type] = await Transaction.count({
        where: { transaction_type: type },
      });
    }

    res.status(200).json({
      message: 'Analytics data retrieved successfully',
      total_transactions: totalTransactions,
      total_amount: parseInt(totalAmount),
      categorized_counts: categorizedCounts,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Internal Server Error', details: error.message });
  }
};
