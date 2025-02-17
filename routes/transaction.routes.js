const express = require('express');
const TransactionController = require('../controllers/transaction.controller');
const router = express.Router();

router.get('/', TransactionController.getAllTransactions);
router.get('/search', TransactionController.searchTransactions);
router.get('/analytics', TransactionController.getAnalytics);
router.post('/import-xml', TransactionController.importTransactionsFromXML);
router.get('/:id', TransactionController.getTransactionById);

module.exports = router;
