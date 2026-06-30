import type { AgentSignal, VisitorType } from '@/lib/traffic-classifier'

export type AnalyticsEventType =
  | 'page_view'
  | 'feedback'
  | 'chat_message'
  | 'discovery'
  | 'api_fetch'

export interface AnalyticsEvent {
  id: string
  ts: number
  type: AnalyticsEventType
  path: string
  slug?: string
  visitorType?: VisitorType
  agentSignal?: AgentSignal
  format?: string
  referer?: string
  vote?: 'yes' | 'no'
  page?: string
}

export type AnalyticsRange = '7d' | '30d' | '90d'

export interface DailyTrafficPoint {
  date: string
  human: number
  agent: number
  total: number
}

export interface AnalyticsSummary {
  range: AnalyticsRange
  totals: {
    pageViews: number
    humanViews: number
    agentViews: number
    feedbackYes: number
    feedbackNo: number
    chatMessages: number
    discoveryHits: number
  }
  dailyTraffic: Array<DailyTrafficPoint>
  topPages: {
    human: Array<{ path: string; views: number }>
    agent: Array<{ path: string; views: number }>
  }
  agentSignals: Array<{ signal: string; count: number }>
  recentFeedback: Array<{ ts: number; page: string; vote: 'yes' | 'no' }>
}
