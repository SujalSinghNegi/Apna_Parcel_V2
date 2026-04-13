'use client'
import { useState } from 'react'
import { ratingsApi, getErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const CRITERIA = [
  { key: 'responseScore', label: 'Response Time', desc: 'How quickly did they respond?' },
  { key: 'accuracyScore', label: 'Accuracy', desc: 'Correct item / correct address?' },
  { key: 'behaviourScore', label: 'Behaviour', desc: 'Were they polite and cooperative?' },
]

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <button key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} onClick={() => onChange(i)}>
          <Star className={cn('w-8 h-8 transition-all',
            i <= (hover || value) ? 'text-amber-400 fill-amber-400 scale-110' : 'text-gray-200')} />
        </button>
      ))}
    </div>
  )
}

export default function RatingsPage({ params }: { params: { orderId: string } }) {
  const router = useRouter()
  const sp = useSearchParams()
  const ratedUserId = sp.get('ratedUserId') || ''
  const [scores, setScores] = useState({ responseScore: 0, accuracyScore: 0, behaviourScore: 0 })
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const allScored = Object.values(scores).every(v => v > 0)
  const avg = allScored ? (Object.values(scores).reduce((a, b) => a + b, 0) / 3) : 0

  const handleSubmit = async () => {
    if (!allScored) { toast.error('Please rate all 3 criteria'); return }
    if (!ratedUserId) { toast.error('Invalid rating target'); return }
    setLoading(true)
    try {
      await ratingsApi.submit(params.orderId, { ratedUserId, ...scores, comment: comment || undefined })
      toast.success('Rating submitted! Thank you 🙏')
      router.push(`/orders/${params.orderId}`)
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }

  return (
    <div className="page-container max-w-md mx-auto space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold text-navy">Rate Your Experience</h1>
        <p className="text-sm text-gray-500 font-sans mt-1">Help the community by sharing your honest feedback</p>
      </div>

      {allScored && (
        <div className="text-center py-4 animate-fade-in">
          <div className="text-5xl font-display font-bold text-brand">{avg.toFixed(1)}</div>
          <div className="flex justify-center gap-1 mt-2">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className={cn('w-5 h-5', i <= Math.round(avg) ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
            ))}
          </div>
          <p className="text-sm text-gray-500 font-sans mt-1">Overall average</p>
        </div>
      )}

      <div className="space-y-3">
        {CRITERIA.map(c => (
          <Card key={c.key}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-display font-semibold text-navy text-sm">{c.label}</p>
                  <p className="text-xs text-gray-500 font-sans">{c.desc}</p>
                </div>
                {scores[c.key as keyof typeof scores] > 0 && (
                  <span className="text-lg font-display font-bold text-brand">{scores[c.key as keyof typeof scores]}/5</span>
                )}
              </div>
              <StarRating value={scores[c.key as keyof typeof scores]}
                onChange={v => setScores(p => ({ ...p, [c.key]: v }))} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="py-4">
          <p className="font-display font-semibold text-navy text-sm mb-2">Comment (optional)</p>
          <textarea className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-sans focus:border-brand focus:outline-none resize-none"
            rows={3} placeholder="Share your experience..." maxLength={500}
            value={comment} onChange={e => setComment(e.target.value)} />
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" onClick={handleSubmit} loading={loading} disabled={!allScored}>
        <Star className="w-4 h-4" /> Submit Rating
      </Button>
    </div>
  )
}
