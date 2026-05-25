import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'

// Page is a thin server shell. All data flow (fetch /api/analytics, range
// state, chart rendering) lives in the AnalyticsDashboard client component.
export default function AnalyticsPage() {
  return <AnalyticsDashboard />
}
