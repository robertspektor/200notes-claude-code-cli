class PaymentService {
  constructor() {
    // In a real app, this would be a database
    this.transactions = new Map();
    this.transactionCounter = 1;
  }

  /**
   * Create a new transaction record
   */
  async createTransaction(data) {
    const transaction = {
      id: this.transactionCounter++,
      stripePaymentIntentId: data.stripePaymentIntentId,
      amount: data.amount,
      currency: data.currency,
      status: data.status || 'pending',
      pdfId: data.pdfId,
      customerId: data.customerId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.transactions.set(transaction.id, transaction);
    console.log(`Transaction created: ${transaction.id}`);
    
    return transaction;
  }

  /**
   * Update transaction by Stripe payment intent ID
   */
  async updateTransactionByStripeId(stripePaymentIntentId, updates) {
    // Find transaction by Stripe ID
    const transaction = Array.from(this.transactions.values())
      .find(t => t.stripePaymentIntentId === stripePaymentIntentId);

    if (!transaction) {
      throw new Error(`Transaction not found for Stripe ID: ${stripePaymentIntentId}`);
    }

    // Apply updates
    Object.assign(transaction, updates, { updatedAt: new Date() });
    
    console.log(`Transaction ${transaction.id} updated:`, updates);
    return transaction;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId) {
    return this.transactions.get(parseInt(transactionId));
  }

  /**
   * Get transaction by Stripe payment intent ID
   */
  async getTransactionByStripeId(stripePaymentIntentId) {
    return Array.from(this.transactions.values())
      .find(t => t.stripePaymentIntentId === stripePaymentIntentId);
  }

  /**
   * Get all transactions for a customer
   */
  async getCustomerTransactions(customerId) {
    return Array.from(this.transactions.values())
      .filter(t => t.customerId === customerId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats() {
    const allTransactions = Array.from(this.transactions.values());
    
    const stats = {
      total: allTransactions.length,
      pending: allTransactions.filter(t => t.status === 'pending').length,
      succeeded: allTransactions.filter(t => t.status === 'succeeded').length,
      failed: allTransactions.filter(t => t.status === 'failed').length,
      totalRevenue: allTransactions
        .filter(t => t.status === 'succeeded')
        .reduce((sum, t) => sum + t.amount, 0)
    };

    return stats;
  }

  /**
   * Validate transaction status
   */
  isValidStatus(status) {
    const validStatuses = ['pending', 'processing', 'succeeded', 'failed', 'canceled'];
    return validStatuses.includes(status);
  }

  /**
   * Update transaction status with validation
   */
  async updateTransactionStatus(transactionId, newStatus) {
    if (!this.isValidStatus(newStatus)) {
      throw new Error(`Invalid transaction status: ${newStatus}`);
    }

    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    // Status transition validation
    const currentStatus = transaction.status;
    const allowedTransitions = {
      'pending': ['processing', 'succeeded', 'failed', 'canceled'],
      'processing': ['succeeded', 'failed'],
      'succeeded': [], // Final status
      'failed': ['pending'], // Allow retry
      'canceled': [] // Final status
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }

    transaction.status = newStatus;
    transaction.updatedAt = new Date();

    console.log(`Transaction ${transactionId} status changed: ${currentStatus} → ${newStatus}`);
    return transaction;
  }

  /**
   * Process refund (mock implementation)
   */
  async processRefund(transactionId, amount = null) {
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    if (transaction.status !== 'succeeded') {
      throw new Error('Can only refund successful transactions');
    }

    const refundAmount = amount || transaction.amount;
    if (refundAmount > transaction.amount) {
      throw new Error('Refund amount cannot exceed transaction amount');
    }

    // In a real app, this would call Stripe's refund API
    console.log(`Processing refund: ${refundAmount} ${transaction.currency} for transaction ${transactionId}`);

    // Create refund record
    const refund = {
      id: `rf_${Date.now()}`,
      transactionId: transactionId,
      amount: refundAmount,
      currency: transaction.currency,
      status: 'succeeded',
      createdAt: new Date()
    };

    // Update transaction
    transaction.refundAmount = (transaction.refundAmount || 0) + refundAmount;
    transaction.updatedAt = new Date();

    if (transaction.refundAmount >= transaction.amount) {
      transaction.status = 'refunded';
    }

    console.log(`Refund processed: ${refund.id}`);
    return refund;
  }
}

module.exports = new PaymentService();