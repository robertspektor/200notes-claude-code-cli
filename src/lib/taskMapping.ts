import * as path from 'path';
import { Task, TaskMapping } from '../types';

export class TaskMappingEngine {
  /**
   * Extract keywords from a file path for task matching
   */
  static extractKeywordsFromPath(filePath: string): string[] {
    const keywords: string[] = [];
    
    // Get filename without extension
    const filename = path.basename(filePath);
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    
    // Add filename
    keywords.push(nameWithoutExt);
    
    // Split camelCase and PascalCase
    const camelCaseWords = nameWithoutExt.split(/(?=[A-Z])/).filter(Boolean);
    keywords.push(...camelCaseWords);
    
    // Split snake_case and kebab-case
    const separatedWords = nameWithoutExt.split(/[-_]/).filter(Boolean);
    keywords.push(...separatedWords);
    
    // Add directory names
    const dirs = path.dirname(filePath).split(path.sep).filter(dir => dir !== '.' && dir !== '/');
    keywords.push(...dirs);
    
    // Clean and normalize keywords
    return keywords
      .map(keyword => keyword.toLowerCase().trim())
      .filter(keyword => keyword.length > 2 && !TaskMappingEngine.isCommonWord(keyword))
      .filter((keyword, index, arr) => arr.indexOf(keyword) === index); // remove duplicates
  }

  /**
   * Extract keywords from file content
   */
  static extractKeywordsFromContent(content: string, filePath: string): string[] {
    const keywords: string[] = [];
    
    // Determine file type
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
        keywords.push(...TaskMappingEngine.extractJSKeywords(content));
        break;
      case '.php':
        keywords.push(...TaskMappingEngine.extractPHPKeywords(content));
        break;
      case '.py':
        keywords.push(...TaskMappingEngine.extractPythonKeywords(content));
        break;
      case '.md':
        keywords.push(...TaskMappingEngine.extractMarkdownKeywords(content));
        break;
      default:
        keywords.push(...TaskMappingEngine.extractGenericKeywords(content));
    }
    
    return keywords
      .map(keyword => keyword.toLowerCase().trim())
      .filter(keyword => keyword.length > 2 && !TaskMappingEngine.isCommonWord(keyword))
      .filter((keyword, index, arr) => arr.indexOf(keyword) === index);
  }

  /**
   * Find tasks that match given keywords
   */
  static findMatchingTasks(tasks: Task[], keywords: string[]): Task[] {
    const matches: Array<{ task: Task; score: number }> = [];
    
    for (const task of tasks) {
      const score = TaskMappingEngine.calculateMatchScore(task, keywords);
      if (score > 0) {
        matches.push({ task, score });
      }
    }
    
    // Sort by score (highest first) and return tasks
    return matches
      .sort((a, b) => b.score - a.score)
      .map(match => match.task);
  }

  /**
   * Calculate how well a task matches the given keywords
   */
  static calculateMatchScore(task: Task, keywords: string[]): number {
    let score = 0;
    
    const taskText = `${task.title} ${task.description || ''} ${task.tags.join(' ')}`.toLowerCase();
    
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      
      // Exact match in title (highest score)
      if (task.title.toLowerCase().includes(keywordLower)) {
        score += 10;
      }
      
      // Match in description
      if (task.description && task.description.toLowerCase().includes(keywordLower)) {
        score += 5;
      }
      
      // Match in tags
      if (task.tags.some(tag => tag.toLowerCase().includes(keywordLower))) {
        score += 7;
      }
      
      // Partial word match
      const words = taskText.split(/\s+/);
      for (const word of words) {
        if (word.includes(keywordLower) || keywordLower.includes(word)) {
          score += 2;
        }
      }
    }
    
    return score;
  }

  /**
   * Suggest task status based on file changes
   */
  static suggestTaskStatus(task: Task, changeType: 'create' | 'modify' | 'delete'): string {
    const currentStatus = task.status;
    
    switch (changeType) {
      case 'create':
      case 'modify':
        // If task is todo, suggest moving to in_progress
        if (currentStatus === 'todo') {
          return 'in_progress';
        }
        return currentStatus;
        
      case 'delete':
        // Deleting files might indicate completion or cancellation
        return currentStatus;
        
      default:
        return currentStatus;
    }
  }

  /**
   * Extract JavaScript/TypeScript specific keywords
   */
  private static extractJSKeywords(content: string): string[] {
    const keywords: string[] = [];
    
    // Function names
    const functionMatches = content.match(/(?:function\s+|const\s+|let\s+|var\s+)(\w+)/g);
    if (functionMatches) {
      keywords.push(...functionMatches.map(match => match.split(/\s+/).pop()!));
    }
    
    // Class names
    const classMatches = content.match(/class\s+(\w+)/g);
    if (classMatches) {
      keywords.push(...classMatches.map(match => match.split(/\s+/)[1]));
    }
    
    // Import statements
    const importMatches = content.match(/import.*from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      keywords.push(...importMatches.map(match => {
        const moduleName = match.match(/['"]([^'"]+)['"]/)![1];
        return path.basename(moduleName, path.extname(moduleName));
      }));
    }
    
    return keywords;
  }

  /**
   * Extract PHP specific keywords
   */
  private static extractPHPKeywords(content: string): string[] {
    const keywords: string[] = [];
    
    // Class names
    const classMatches = content.match(/class\s+(\w+)/g);
    if (classMatches) {
      keywords.push(...classMatches.map(match => match.split(/\s+/)[1]));
    }
    
    // Function names
    const functionMatches = content.match(/function\s+(\w+)/g);
    if (functionMatches) {
      keywords.push(...functionMatches.map(match => match.split(/\s+/)[1]));
    }
    
    // Namespace
    const namespaceMatches = content.match(/namespace\s+([\w\\]+)/g);
    if (namespaceMatches) {
      keywords.push(...namespaceMatches.map(match => {
        const namespace = match.split(/\s+/)[1];
        return namespace.split('\\').pop()!;
      }));
    }
    
    return keywords;
  }

  /**
   * Extract Python specific keywords
   */
  private static extractPythonKeywords(content: string): string[] {
    const keywords: string[] = [];
    
    // Class names
    const classMatches = content.match(/class\s+(\w+)/g);
    if (classMatches) {
      keywords.push(...classMatches.map(match => match.split(/\s+/)[1]));
    }
    
    // Function names
    const functionMatches = content.match(/def\s+(\w+)/g);
    if (functionMatches) {
      keywords.push(...functionMatches.map(match => match.split(/\s+/)[1]));
    }
    
    return keywords;
  }

  /**
   * Extract Markdown specific keywords
   */
  private static extractMarkdownKeywords(content: string): string[] {
    const keywords: string[] = [];
    
    // Headers
    const headerMatches = content.match(/#{1,6}\s+(.+)/g);
    if (headerMatches) {
      keywords.push(...headerMatches.map(match => 
        match.replace(/#{1,6}\s+/, '').trim()
      ));
    }
    
    // Task items
    const taskMatches = content.match(/[-*]\s+\[.\]\s+(.+)/g);
    if (taskMatches) {
      keywords.push(...taskMatches.map(match => 
        match.replace(/[-*]\s+\[.\]\s+/, '').trim()
      ));
    }
    
    return keywords;
  }

  /**
   * Extract generic keywords from any text
   */
  private static extractGenericKeywords(content: string): string[] {
    // Extract words that look like identifiers or important terms
    const words = content.match(/\b[A-Z][a-zA-Z]+\b/g) || [];
    return words.filter(word => word.length > 3);
  }

  /**
   * Check if a word is too common to be useful
   */
  private static isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'her', 'his', 'how', 'its', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'may', 'she', 'use', 'your', 'said', 'each', 'make', 'most', 'over', 'such', 'time', 'very', 'what', 'with', 'have', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'than', 'them', 'well', 'were',
      'function', 'return', 'const', 'var', 'let', 'if', 'else', 'for', 'while', 'do', 'try', 'catch', 'throw', 'new', 'this', 'super', 'extends', 'implements', 'interface', 'type', 'export', 'import', 'default', 'async', 'await',
      'public', 'private', 'protected', 'static', 'final', 'abstract', 'class', 'namespace', 'use',
      'def', 'class', 'import', 'from', 'as', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'finally', 'with', 'lambda', 'yield', 'return',
      'index', 'main', 'app', 'src', 'test', 'tests', 'lib', 'libs', 'config', 'dist', 'build', 'node', 'modules'
    ]);
    
    return commonWords.has(word.toLowerCase());
  }
}