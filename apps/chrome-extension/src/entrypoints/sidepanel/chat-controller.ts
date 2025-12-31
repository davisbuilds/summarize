import type MarkdownIt from 'markdown-it'

import {
  buildChatRequestMessages,
  type ChatHistoryLimits,
  computeChatContextUsage,
  hasUserChatMessage,
} from './chat-state'
import type { ChatMessage } from './types'

type RenderOptions = { prepend?: boolean; scroll?: boolean }

export type ChatControllerOptions = {
  messagesEl: HTMLDivElement
  inputEl: HTMLTextAreaElement
  sendBtn: HTMLButtonElement
  contextEl: HTMLDivElement
  markdown: MarkdownIt
  limits: ChatHistoryLimits
  scrollToBottom?: () => void
  onNewContent?: () => void
}

export class ChatController {
  private messages: ChatMessage[] = []
  private readonly messagesEl: HTMLDivElement
  private readonly inputEl: HTMLTextAreaElement
  private readonly sendBtn: HTMLButtonElement
  private readonly contextEl: HTMLDivElement
  private readonly markdown: MarkdownIt
  private readonly limits: ChatHistoryLimits
  private readonly scrollToBottom?: () => void
  private readonly onNewContent?: () => void
  private readonly typingIndicatorHtml =
    '<span class="chatTyping" aria-label="Typing"><span></span><span></span><span></span></span>'

  private readonly timestampPattern = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g

  constructor(opts: ChatControllerOptions) {
    this.messagesEl = opts.messagesEl
    this.inputEl = opts.inputEl
    this.sendBtn = opts.sendBtn
    this.contextEl = opts.contextEl
    this.markdown = opts.markdown
    this.limits = opts.limits
    this.scrollToBottom = opts.scrollToBottom
    this.onNewContent = opts.onNewContent
  }

  getMessages(): ChatMessage[] {
    return this.messages
  }

  hasUserMessages(): boolean {
    return hasUserChatMessage(this.messages)
  }

  buildRequestMessages() {
    return buildChatRequestMessages(this.messages)
  }

  reset() {
    this.messages = []
    this.messagesEl.innerHTML = ''
    this.inputEl.value = ''
    this.sendBtn.disabled = false
    this.updateVisibility()
    this.updateContextStatus()
  }

  setMessages(messages: ChatMessage[], opts?: RenderOptions) {
    this.messages = messages
    this.messagesEl.innerHTML = ''
    for (const message of messages) {
      this.renderMessage(message, { scroll: false })
    }
    if (opts?.scroll !== false) {
      this.onNewContent?.()
      this.scrollToBottom?.()
    }
    this.updateVisibility()
    this.updateContextStatus()
  }

  addMessage(message: ChatMessage, opts?: RenderOptions) {
    this.messages.push(message)
    this.renderMessage(message, opts)
    this.updateVisibility()
    this.updateContextStatus()
  }

  updateStreamingMessage(content: string) {
    const lastMsg = this.messages[this.messages.length - 1]
    if (lastMsg?.role === 'assistant') {
      lastMsg.content = content
      const msgEl = this.messagesEl.querySelector(`[data-id="${lastMsg.id}"]`)
      if (msgEl) {
        if (content.trim()) {
          msgEl.innerHTML = this.markdown.render(this.linkifyTimestamps(content))
          msgEl.removeAttribute('data-placeholder')
        } else {
          msgEl.innerHTML = this.typingIndicatorHtml
          msgEl.setAttribute('data-placeholder', 'true')
        }
        msgEl.classList.add('streaming')
        this.decorateAnchors(msgEl)
        this.onNewContent?.()
        this.scrollToBottom?.()
      }
    }
    this.updateContextStatus()
  }

  finishStreamingMessage() {
    const lastMsg = this.messages[this.messages.length - 1]
    if (lastMsg?.role === 'assistant') {
      const msgEl = this.messagesEl.querySelector(`[data-id="${lastMsg.id}"]`)
      if (msgEl) {
        msgEl.classList.remove('streaming')
        msgEl.removeAttribute('data-placeholder')
      }
    }
    this.updateContextStatus()
  }

  private renderMessage(message: ChatMessage, opts?: RenderOptions) {
    const msgEl = document.createElement('div')
    msgEl.className = `chatMessage ${message.role}`
    msgEl.dataset.id = message.id

    if (message.role === 'assistant') {
      if (message.content.trim()) {
        msgEl.innerHTML = this.markdown.render(this.linkifyTimestamps(message.content))
      } else {
        msgEl.innerHTML = this.typingIndicatorHtml
        msgEl.classList.add('streaming')
        msgEl.setAttribute('data-placeholder', 'true')
      }
      this.decorateAnchors(msgEl)
    } else {
      msgEl.textContent = message.content
    }

    if (opts?.prepend) {
      this.messagesEl.prepend(msgEl)
    } else {
      this.messagesEl.appendChild(msgEl)
    }

    if (opts?.scroll !== false) {
      this.onNewContent?.()
      this.scrollToBottom?.()
    }
  }

  private updateVisibility() {
    const hasMessages = this.messages.length > 0
    this.messagesEl.classList.toggle('isHidden', !hasMessages)
  }

  private updateContextStatus() {
    if (!this.hasUserMessages()) {
      this.contextEl.textContent = ''
      this.contextEl.removeAttribute('data-state')
      this.contextEl.classList.add('isHidden')
      return
    }
    const usage = computeChatContextUsage(this.messages, this.limits)
    this.contextEl.classList.remove('isHidden')
    this.contextEl.textContent = `Context ${usage.percent}% · ${usage.totalMessages} msgs · ${usage.totalChars.toLocaleString()} chars`
    if (usage.percent >= 85) {
      this.contextEl.dataset.state = 'warn'
    } else {
      this.contextEl.removeAttribute('data-state')
    }
  }

  private linkifyTimestamps(content: string): string {
    return content.replace(this.timestampPattern, (match, time) => {
      const seconds = parseTimestampSeconds(time)
      if (seconds == null) return match
      return `[${time}](timestamp:${seconds})`
    })
  }

  private decorateAnchors(root: HTMLElement) {
    for (const a of Array.from(root.querySelectorAll('a'))) {
      const href = a.getAttribute('href') ?? ''
      if (href.startsWith('timestamp:')) {
        a.classList.add('chatTimestamp')
        a.removeAttribute('target')
        a.removeAttribute('rel')
        continue
      }
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
    }
  }
}

function parseTimestampSeconds(value: string): number | null {
  const parts = value.split(':').map((part) => part.trim())
  if (parts.length < 2 || parts.length > 3) return null
  const secondsPart = parts.pop()
  if (!secondsPart) return null
  const seconds = Number(secondsPart)
  if (!Number.isFinite(seconds) || seconds < 0) return null
  const minutesPart = parts.pop()
  if (minutesPart == null) return null
  const minutes = Number(minutesPart)
  if (!Number.isFinite(minutes) || minutes < 0) return null
  const hoursPart = parts.pop()
  const hours = hoursPart != null ? Number(hoursPart) : 0
  if (!Number.isFinite(hours) || hours < 0) return null
  return Math.floor(hours * 3600 + minutes * 60 + seconds)
}
