import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export interface GrammarIssue {
  type: 'grammar' | 'spelling' | 'style' | 'clarity'
  start: number
  end: number
  suggestion: string
  explanation: string
}

export interface GrammarMarkOptions {
  issues: GrammarIssue[]
  selectedIndex: number | null
}

const colorMap: Record<string, string> = {
  grammar: 'rgba(239, 68, 68, 0.7)', // red
  spelling: 'rgba(239, 68, 68, 0.7)', // red
  style: 'rgba(59, 130, 246, 0.7)', // blue
  clarity: 'rgba(253, 224, 71, 0.7)', // yellow
}

const highlightMap: Record<string, string> = {
  grammar: 'rgba(239, 68, 68, 0.2)',
  spelling: 'rgba(239, 68, 68, 0.2)',
  style: 'rgba(59, 130, 246, 0.2)',
  clarity: 'rgba(253, 224, 71, 0.2)',
}

export const GrammarMark = Mark.create<GrammarMarkOptions>({
  name: 'grammarMark',

  addOptions() {
    return {
      issues: [],
      selectedIndex: null,
    }
  },

  addAttributes() {
    return {
      issueIndex: {
        default: null,
        parseHTML: el => el.getAttribute('data-issue-index'),
        renderHTML: attrs => {
          if (attrs.issueIndex !== null) {
            return { 'data-issue-index': attrs.issueIndex }
          }
          return {}
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-issue-index]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const idx = HTMLAttributes['data-issue-index']
    let style = ''
    if (idx !== undefined && idx !== null && this.options.issues[idx]) {
      const issue = this.options.issues[idx]
      style = `border-bottom: 2px solid ${colorMap[issue.type]};`
      if (this.options.selectedIndex === Number(idx)) {
        style += `background: ${highlightMap[issue.type]};`
      }
    }
    return [
      'span',
      mergeAttributes(HTMLAttributes, { style }),
      0
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: (state: any) => {
            const decorations: Decoration[] = []
            const { doc } = state
            const issues = this.options.issues
            const selectedIndex = this.options.selectedIndex
            if (!issues || !Array.isArray(issues)) return null
            let pos = 0
            doc.descendants((node: any, posInner: number) => {
              if (!node.isText) return true
              issues.forEach((issue, idx) => {
                const from = issue.start
                const to = issue.end
                if (from < to && pos + node.text.length >= from && pos <= to) {
                  const start = Math.max(from, pos)
                  const end = Math.min(to, pos + node.text.length)
                  decorations.push(
                    Decoration.inline(
                      start,
                      end,
                      {
                        class: 'grammar-mark',
                        'data-issue-index': String(idx),
                        style: `border-bottom: 2px solid ${colorMap[issue.type]};${selectedIndex === idx ? `background: ${highlightMap[issue.type]};` : ''}`
                      }
                    )
                  )
                  console.log('[GrammarMark] Decorating', { idx, from: start, to: end, type: issue.type, selected: selectedIndex === idx })
                }
              })
              pos += node.text.length
              return false
            })
            return DecorationSet.create(doc, decorations)
          }
        }
      })
    ]
  }
}) 