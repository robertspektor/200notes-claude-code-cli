const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class PdfService {
  constructor() {
    this.browser = null;
    this.downloadLimits = new Map(); // Track download attempts
  }

  /**
   * Initialize browser for PDF generation
   */
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  /**
   * Generate PDF from HTML content
   */
  async generatePdf(htmlContent, options = {}) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '20mm',
          right: '20mm'
        },
        ...options
      });

      return pdfBuffer;

    } finally {
      await page.close();
    }
  }

  /**
   * Generate PDF from URL
   */
  async generatePdfFromUrl(url, options = {}) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '20mm',
          right: '20mm'
        },
        ...options
      });

      return pdfBuffer;

    } finally {
      await page.close();
    }
  }

  /**
   * Save PDF to file system
   */
  async savePdf(pdfBuffer, filename) {
    const uploadsDir = path.join(__dirname, '../../uploads/pdfs');
    
    // Ensure directory exists
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, pdfBuffer);
    
    return filePath;
  }

  /**
   * Unlock premium content after successful payment
   */
  async unlockPremiumContent(pdfId, customerId) {
    try {
      // In a real app, this would update database records
      console.log(`Unlocking premium content for PDF ${pdfId}, customer ${customerId}`);
      
      // TODO: Update database to mark content as purchased
      // await db.PremiumContent.update(
      //   { customerId, accessGranted: true, purchaseDate: new Date() },
      //   { where: { pdfId } }
      // );

      return true;
    } catch (error) {
      console.error('Error unlocking premium content:', error);
      throw error;
    }
  }

  /**
   * Get secure download URL for purchased PDF
   */
  async getDownloadUrl(pdfId, customerId) {
    try {
      // Check if customer has access to this PDF
      const hasAccess = await this.checkCustomerAccess(pdfId, customerId);
      
      if (!hasAccess) {
        throw new Error('Access denied: PDF not purchased');
      }

      // Check download limits (e.g., max 5 downloads per purchase)
      const downloadCount = this.downloadLimits.get(`${pdfId}-${customerId}`) || 0;
      if (downloadCount >= 5) {
        throw new Error('Download limit exceeded');
      }

      // Generate secure, time-limited URL
      const token = this.generateSecureToken(pdfId, customerId);
      const downloadUrl = `/api/pdf/download/${pdfId}?token=${token}`;

      // Increment download count
      this.downloadLimits.set(`${pdfId}-${customerId}`, downloadCount + 1);

      return downloadUrl;

    } catch (error) {
      console.error('Error generating download URL:', error);
      throw error;
    }
  }

  /**
   * Check if customer has access to PDF
   */
  async checkCustomerAccess(pdfId, customerId) {
    // TODO: Check database for purchase record
    // const purchase = await db.PremiumContent.findOne({
    //   where: { pdfId, customerId, accessGranted: true }
    // });
    // return !!purchase;

    // Mock implementation
    return true;
  }

  /**
   * Generate secure token for download
   */
  generateSecureToken(pdfId, customerId) {
    const crypto = require('crypto');
    const timestamp = Date.now();
    const expiry = timestamp + (24 * 60 * 60 * 1000); // 24 hours
    
    const payload = `${pdfId}:${customerId}:${expiry}`;
    const secret = process.env.PDF_DOWNLOAD_SECRET || 'default-secret';
    
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return Buffer.from(`${payload}:${signature}`).toString('base64');
  }

  /**
   * Verify download token
   */
  verifyDownloadToken(token, pdfId, customerId) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const [tokenPdfId, tokenCustomerId, expiry, signature] = decoded.split(':');

      // Check if token matches request
      if (tokenPdfId !== pdfId || tokenCustomerId !== customerId) {
        return false;
      }

      // Check if token is expired
      if (Date.now() > parseInt(expiry)) {
        return false;
      }

      // Verify signature
      const crypto = require('crypto');
      const payload = `${tokenPdfId}:${tokenCustomerId}:${expiry}`;
      const secret = process.env.PDF_DOWNLOAD_SECRET || 'default-secret';
      
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return signature === expectedSignature;

    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  /**
   * Clean up browser resources
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new PdfService();