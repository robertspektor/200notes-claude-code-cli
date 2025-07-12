const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PaymentService = require('../services/PaymentService');
const PdfService = require('../services/PdfService');

class PaymentController {
  /**
   * Create a new payment intent for PDF purchase
   */
  async createPaymentIntent(req, res) {
    try {
      const { amount, currency = 'eur', pdfId } = req.body;

      // Validate request
      if (!amount || !pdfId) {
        return res.status(400).json({
          error: 'Amount and pdfId are required'
        });
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency: currency,
        metadata: {
          pdfId: pdfId,
          source: 'pdf_purchase'
        }
      });

      // Store transaction record
      const transaction = await PaymentService.createTransaction({
        stripePaymentIntentId: paymentIntent.id,
        amount: amount,
        currency: currency,
        status: 'pending',
        pdfId: pdfId
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        transactionId: transaction.id
      });

    } catch (error) {
      console.error('Payment intent creation failed:', error);
      res.status(500).json({
        error: 'Payment processing failed'
      });
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSucceeded(paymentIntent) {
    try {
      // Update transaction status
      await PaymentService.updateTransactionByStripeId(
        paymentIntent.id,
        { status: 'succeeded' }
      );

      // Unlock premium content
      const pdfId = paymentIntent.metadata.pdfId;
      if (pdfId) {
        await PdfService.unlockPremiumContent(pdfId, paymentIntent.customer);
        
        // TODO: Send email notification
        // await EmailService.sendPurchaseConfirmation(customer, pdfId);
      }

      console.log(`Payment succeeded for PDF ${pdfId}`);
    } catch (error) {
      console.error('Error handling successful payment:', error);
    }
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailed(paymentIntent) {
    try {
      // Update transaction status
      await PaymentService.updateTransactionByStripeId(
        paymentIntent.id,
        { status: 'failed' }
      );

      console.log(`Payment failed for intent ${paymentIntent.id}`);
    } catch (error) {
      console.error('Error handling failed payment:', error);
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(req, res) {
    try {
      const { transactionId } = req.params;
      
      const transaction = await PaymentService.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.json({
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        pdfId: transaction.pdfId,
        downloadUrl: transaction.status === 'succeeded' 
          ? await PdfService.getDownloadUrl(transaction.pdfId)
          : null
      });

    } catch (error) {
      console.error('Error getting transaction status:', error);
      res.status(500).json({ error: 'Failed to get transaction status' });
    }
  }
}

module.exports = new PaymentController();