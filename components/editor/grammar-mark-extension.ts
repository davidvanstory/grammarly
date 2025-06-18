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
            
            if (!issues || !Array.isArray(issues)) {
              console.log("🎨 [GrammarMark] No issues to decorate")
              return null
            }
            
            console.log("🎨 [GrammarMark] Decorating", issues.length, "issues")
            
            issues.forEach((issue, idx) => {
              const issueId = `Issue ${idx + 1}`
              console.log(`🎨 [GrammarMark] ${issueId}: Processing decoration`, {
                type: issue.type,
                positions: `${issue.start}-${issue.end}`,
                suggestion: issue.suggestion,
                selected: selectedIndex === idx
              })
              
              const from = issue.start
              const to = issue.end
              
              // Validate positions
              if (from >= to || from < 0 || to > doc.content.size) {
                console.warn(`⚠️  [GrammarMark] ${issueId}: Invalid decoration positions - from: ${from}, to: ${to}, doc size: ${doc.content.size}`)
                return
              }
              
              // Extract text for verification
              const decoratedText = doc.textBetween(from, to)
              console.log(`🎨 [GrammarMark] ${issueId}: Decorating text:`, `"${decoratedText}"`)
              
              // Create decoration
              decorations.push(
                Decoration.inline(
                  from,
                  to,
                  {
                    class: 'grammar-mark',
                    'data-issue-index': String(idx),
                    style: `border-bottom: 2px solid ${colorMap[issue.type]};${selectedIndex === idx ? `background: ${highlightMap[issue.type]};` : ''}`
                  }
                )
              )
              
              console.log(`✅ [GrammarMark] ${issueId}: Decoration created successfully at positions ${from}-${to}`)
            })
            
            console.log("🎨 [GrammarMark] Created", decorations.length, "decorations total")
            return DecorationSet.create(doc, decorations)
          }
        }
      })
    ]
  }
}) 