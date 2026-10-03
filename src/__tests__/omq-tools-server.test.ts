import { describe, it, expect } from 'vitest';
import { omqToolsServer, omqToolNames, getOmqToolNames } from '../mcp/omq-tools-server.js';

const interopEnabled = process.env.OMQ_INTEROP_TOOLS_ENABLED === '1';
const totalTools = interopEnabled ? 82 : 74;
const withoutLsp = interopEnabled ? 70 : 62;
const withoutAst = interopEnabled ? 80 : 72;
const withoutPython = interopEnabled ? 81 : 73;
const withoutSkills = interopEnabled ? 79 : 71;

describe('omq-tools-server', () => {
  describe('omqToolNames', () => {
    it('should export expected tools total', () => {
      expect(omqToolNames).toHaveLength(totalTools);
    });

    it('should have 12 LSP tools', () => {
      const lspTools = omqToolNames.filter(n => n.includes('lsp_'));
      expect(lspTools).toHaveLength(12);
    });

    it('should have 2 AST tools', () => {
      const astTools = omqToolNames.filter(n => n.includes('ast_'));
      expect(astTools).toHaveLength(2);
    });

    it('should have python_repl tool', () => {
      expect(omqToolNames).toContain('mcp__t__python_repl');
    });

    it('should have session_search tool', () => {
      expect(omqToolNames).toContain('mcp__t__session_search');
    });

    it('should use correct MCP naming format', () => {
      omqToolNames.forEach(name => {
        expect(name).toMatch(/^mcp__t__/);
      });
    });
  });

  describe('getOmqToolNames', () => {
    it('should return all tools by default', () => {
      const tools = getOmqToolNames();
      expect(tools).toHaveLength(totalTools);
    });

    it('should filter out LSP tools when includeLsp is false', () => {
      const tools = getOmqToolNames({ includeLsp: false });
      expect(tools.some(t => t.includes('lsp_'))).toBe(false);
      expect(tools).toHaveLength(withoutLsp);
    });

    it('should filter out AST tools when includeAst is false', () => {
      const tools = getOmqToolNames({ includeAst: false });
      expect(tools.some(t => t.includes('ast_'))).toBe(false);
      expect(tools).toHaveLength(withoutAst);
    });

    it('should filter out python_repl when includePython is false', () => {
      const tools = getOmqToolNames({ includePython: false });
      expect(tools.some(t => t.includes('python_repl'))).toBe(false);
      expect(tools).toHaveLength(withoutPython);
    });

    it('should filter out skills tools', () => {
      const names = getOmqToolNames({ includeSkills: false });
      expect(names).toHaveLength(withoutSkills);
      expect(names.every(n => !n.includes('load_omq_skills') && !n.includes('list_omq_skills'))).toBe(true);
    });

    it('should have 3 skills tools', () => {
      const skillsTools = omqToolNames.filter(n => n.includes('load_omq_skills') || n.includes('list_omq_skills'));
      expect(skillsTools).toHaveLength(3);
    });

    it('supports includeInterop filter option', () => {
      const withInterop = getOmqToolNames({ includeInterop: true });
      const withoutInterop = getOmqToolNames({ includeInterop: false });

      if (interopEnabled) {
        expect(withInterop.some(n => n.includes('interop_'))).toBe(true);
      }
      expect(withoutInterop.some(n => n.includes('interop_'))).toBe(false);
    });
  });

  describe('omqToolsServer', () => {
    it('should be defined', () => {
      expect(omqToolsServer).toBeDefined();
    });
  });
});
