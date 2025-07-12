import { TaskMappingEngine } from '../../src/lib/taskMapping';
import { Task } from '../../src/types';
import { testHelpers } from '../setup';

describe('TaskMappingEngine', () => {
  describe('extractKeywordsFromPath', () => {
    it('should extract keywords from simple file path', () => {
      const keywords = TaskMappingEngine.extractKeywordsFromPath('PaymentController.js');
      
      expect(keywords).toContain('paymentcontroller');
      expect(keywords).toContain('payment');
      expect(keywords).toContain('controller');
    });

    it('should extract keywords from nested file path', () => {
      const keywords = TaskMappingEngine.extractKeywordsFromPath('src/controllers/PaymentController.js');
      
      expect(keywords).toContain('controllers');
      expect(keywords).toContain('paymentcontroller');
      expect(keywords).toContain('payment');
      expect(keywords).toContain('controller');
    });

    it('should handle snake_case filenames', () => {
      const keywords = TaskMappingEngine.extractKeywordsFromPath('stripe_webhook_handler.js');
      
      expect(keywords).toContain('stripe');
      expect(keywords).toContain('webhook');
      expect(keywords).toContain('handler');
    });

    it('should handle kebab-case filenames', () => {
      const keywords = TaskMappingEngine.extractKeywordsFromPath('payment-service.js');
      
      expect(keywords).toContain('payment');
      expect(keywords).toContain('service');
    });

    it('should filter out common words', () => {
      const keywords = TaskMappingEngine.extractKeywordsFromPath('src/index.js');
      
      expect(keywords).not.toContain('src');
      expect(keywords).not.toContain('index');
    });

    it('should remove duplicates', () => {
      const keywords = TaskMappingEngine.extractKeywordsFromPath('payment/PaymentService.js');
      
      const paymentCount = keywords.filter(k => k === 'payment').length;
      expect(paymentCount).toBe(1);
    });

    it('should handle file extensions correctly', () => {
      const keywords = TaskMappingEngine.extractKeywordsFromPath('UserController.ts');
      
      expect(keywords).toContain('usercontroller');
      expect(keywords).toContain('user');
      expect(keywords).toContain('controller');
      expect(keywords).not.toContain('ts');
    });
  });

  describe('extractKeywordsFromContent', () => {
    describe('JavaScript/TypeScript files', () => {
      it('should extract function names', () => {
        const content = `
          function createPayment() {}
          const processRefund = () => {}
          let validateStripe = function() {}
        `;
        
        const keywords = TaskMappingEngine.extractKeywordsFromContent(content, 'test.js');
        
        expect(keywords).toContain('createpayment');
        expect(keywords).toContain('processrefund');
        expect(keywords).toContain('validatestripe');
      });

      it('should extract class names', () => {
        const content = `
          class PaymentController {}
          class StripeService extends BaseService {}
        `;
        
        const keywords = TaskMappingEngine.extractKeywordsFromContent(content, 'test.ts');
        
        expect(keywords).toContain('paymentcontroller');
        expect(keywords).toContain('stripeservice');
      });

      it('should extract import module names', () => {
        const content = `
          import stripe from 'stripe';
          import { PaymentService } from './payment-service';
          import axios from 'axios';
        `;
        
        const keywords = TaskMappingEngine.extractKeywordsFromContent(content, 'test.js');
        
        expect(keywords).toContain('stripe');
        expect(keywords).toContain('payment-service');
        expect(keywords).toContain('axios');
      });
    });

    describe('PHP files', () => {
      it('should extract PHP class and function names', () => {
        const content = `
          <?php
          namespace App\\Services;
          
          class PaymentController {
            public function processPayment() {}
            public function handleWebhook() {}
          }
        `;
        
        const keywords = TaskMappingEngine.extractKeywordsFromContent(content, 'test.php');
        
        expect(keywords).toContain('paymentcontroller');
        expect(keywords).toContain('processpayment');
        expect(keywords).toContain('handlewebhook');
        expect(keywords).toContain('services');
      });
    });

    describe('Python files', () => {
      it('should extract Python class and function names', () => {
        const content = `
          class PaymentProcessor:
              def process_payment(self):
                  pass
              
              def validate_webhook(self):
                  pass
        `;
        
        const keywords = TaskMappingEngine.extractKeywordsFromContent(content, 'test.py');
        
        expect(keywords).toContain('paymentprocessor');
        expect(keywords).toContain('process_payment');
        expect(keywords).toContain('validate_webhook');
      });
    });

    describe('Markdown files', () => {
      it('should extract headers and task items', () => {
        const content = `
          # Payment Integration
          ## Stripe Setup
          
          - [x] Configure Stripe keys
          - [ ] Implement webhook handler
          - [ ] Add payment validation
        `;
        
        const keywords = TaskMappingEngine.extractKeywordsFromContent(content, 'README.md');
        
        expect(keywords).toContain('payment integration');
        expect(keywords).toContain('stripe setup');
        expect(keywords).toContain('configure stripe keys');
        expect(keywords).toContain('implement webhook handler');
      });
    });

    it('should filter out common words', () => {
      const content = `
        function and() {}
        const the = 'value';
        class For {}
      `;
      
      const keywords = TaskMappingEngine.extractKeywordsFromContent(content, 'test.js');
      
      expect(keywords).not.toContain('and');
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('for');
    });
  });

  describe('findMatchingTasks', () => {
    let mockTasks: Task[];

    beforeEach(() => {
      mockTasks = [
        testHelpers.createMockTask({
          id: 1,
          title: 'Implement Stripe webhook',
          description: 'Handle payment confirmations',
          tags: ['stripe', 'webhook', 'payment']
        }),
        testHelpers.createMockTask({
          id: 2,
          title: 'PDF generation service',
          description: 'Generate PDFs for download',
          tags: ['pdf', 'download']
        }),
        testHelpers.createMockTask({
          id: 3,
          title: 'User authentication',
          description: 'Login and registration',
          tags: ['auth', 'user']
        }),
        testHelpers.createMockTask({
          id: 4,
          title: 'Payment processing',
          description: 'Process Stripe payments',
          tags: ['payment', 'stripe']
        })
      ];
    });

    it('should find tasks matching keywords', () => {
      const keywords = ['stripe', 'payment'];
      const matches = TaskMappingEngine.findMatchingTasks(mockTasks, keywords);
      
      expect(matches).toHaveLength(2);
      // Task 4 has "Payment processing" title which matches "payment" directly
      // Task 1 has "Stripe" in title but "payment" only in description/tags
      expect(matches[0].id).toBe(4); // Should be highest scoring due to title match
      expect(matches[1].id).toBe(1);
    });

    it('should return tasks sorted by relevance score', () => {
      const keywords = ['stripe'];
      const matches = TaskMappingEngine.findMatchingTasks(mockTasks, keywords);
      
      expect(matches).toHaveLength(2);
      // Task with 'stripe' in title should score higher than task with 'stripe' only in tags/description
      expect(matches[0].title).toBe('Implement Stripe webhook');
    });

    it('should return empty array when no matches found', () => {
      const keywords = ['nonexistent'];
      const matches = TaskMappingEngine.findMatchingTasks(mockTasks, keywords);
      
      expect(matches).toHaveLength(0);
    });

    it('should handle case insensitive matching', () => {
      const keywords = ['STRIPE', 'Payment'];
      const matches = TaskMappingEngine.findMatchingTasks(mockTasks, keywords);
      
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should match partial words', () => {
      const keywords = ['pay']; // Should match 'payment'
      const matches = TaskMappingEngine.findMatchingTasks(mockTasks, keywords);
      
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('calculateMatchScore', () => {
    let mockTask: Task;

    beforeEach(() => {
      mockTask = testHelpers.createMockTask({
        title: 'Stripe webhook implementation',
        description: 'Handle payment confirmations from Stripe',
        tags: ['stripe', 'webhook', 'payment']
      });
    });

    it('should give highest score for title matches', () => {
      const score = TaskMappingEngine.calculateMatchScore(mockTask, ['stripe']);
      expect(score).toBeGreaterThan(0);
      
      // Title match should score higher than description match
      const descriptionOnlyTask = testHelpers.createMockTask({
        title: 'Some task',
        description: 'Handle stripe payments',
        tags: []
      });
      const descriptionScore = TaskMappingEngine.calculateMatchScore(descriptionOnlyTask, ['stripe']);
      expect(score).toBeGreaterThan(descriptionScore);
    });

    it('should score tag matches highly', () => {
      const score = TaskMappingEngine.calculateMatchScore(mockTask, ['webhook']);
      expect(score).toBeGreaterThan(0);
    });

    it('should accumulate scores for multiple matches', () => {
      const singleKeywordScore = TaskMappingEngine.calculateMatchScore(mockTask, ['stripe']);
      const multipleKeywordScore = TaskMappingEngine.calculateMatchScore(mockTask, ['stripe', 'webhook']);
      
      expect(multipleKeywordScore).toBeGreaterThan(singleKeywordScore);
    });

    it('should return 0 for no matches', () => {
      const score = TaskMappingEngine.calculateMatchScore(mockTask, ['nonexistent']);
      expect(score).toBe(0);
    });

    it('should handle empty keywords array', () => {
      const score = TaskMappingEngine.calculateMatchScore(mockTask, []);
      expect(score).toBe(0);
    });
  });

  describe('suggestTaskStatus', () => {
    let mockTask: Task;

    beforeEach(() => {
      mockTask = testHelpers.createMockTask({
        status: 'todo'
      });
    });

    it('should suggest in_progress for todo tasks when files are created/modified', () => {
      const newStatus = TaskMappingEngine.suggestTaskStatus(mockTask, 'create');
      expect(newStatus).toBe('in_progress');

      const modifyStatus = TaskMappingEngine.suggestTaskStatus(mockTask, 'modify');
      expect(modifyStatus).toBe('in_progress');
    });

    it('should not change status for already in_progress tasks', () => {
      const inProgressTask = testHelpers.createMockTask({ status: 'in_progress' });
      const newStatus = TaskMappingEngine.suggestTaskStatus(inProgressTask, 'modify');
      expect(newStatus).toBe('in_progress');
    });

    it('should not change status for completed tasks', () => {
      const completedTask = testHelpers.createMockTask({ status: 'done' });
      const newStatus = TaskMappingEngine.suggestTaskStatus(completedTask, 'modify');
      expect(newStatus).toBe('done');
    });

    it('should maintain current status for file deletions', () => {
      const newStatus = TaskMappingEngine.suggestTaskStatus(mockTask, 'delete');
      expect(newStatus).toBe('todo');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty file paths', () => {
      const keywords = TaskMappingEngine.extractKeywordsFromPath('');
      expect(keywords).toEqual([]);
    });

    it('should handle empty content', () => {
      const keywords = TaskMappingEngine.extractKeywordsFromContent('', 'test.js');
      expect(keywords).toEqual([]);
    });

    it('should handle files without extensions', () => {
      const keywords = TaskMappingEngine.extractKeywordsFromPath('Dockerfile');
      expect(keywords).toContain('dockerfile');
    });

    it('should handle very short keywords', () => {
      const keywords = TaskMappingEngine.extractKeywordsFromPath('a.js');
      expect(keywords).not.toContain('a'); // Should filter out short words
    });

    it('should handle special characters in file paths', () => {
      const keywords = TaskMappingEngine.extractKeywordsFromPath('src/special-chars_@#$.js');
      expect(keywords).toContain('special');
      expect(keywords).toContain('chars');
    });

    it('should handle empty tasks array', () => {
      const matches = TaskMappingEngine.findMatchingTasks([], ['stripe']);
      expect(matches).toEqual([]);
    });

    it('should handle tasks with null/undefined fields', () => {
      const taskWithNulls = testHelpers.createMockTask({
        description: undefined,
        tags: []
      });

      const score = TaskMappingEngine.calculateMatchScore(taskWithNulls, ['test']);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });
});