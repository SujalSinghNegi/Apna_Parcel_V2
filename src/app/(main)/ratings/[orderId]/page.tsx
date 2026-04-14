'use client'
import { useState, useEffect, use } from 'react'
import { ratingsApi, getErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Star, CheckCircle, Loader2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Rating } from '@/types'

const CRITERIA = [
  { key: 'responseScore', label: 'Response Time', desc: 'How quickly did they respond?', emoji: '⚡' },
  { key: 'accuracyScore', label: 'Accuracy', desc: 'Correct item / correct address?', emoji: '🎯' },
  { key: 'behaviourScore', label: 'Behaviour', desc: 'Were they polite and cooperative?', emoji: '🤝' },
]

function StarRating({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1.5">
      {[1,2,3,4,5].map(i => (
        <button key={i} disabled={disabled}
          onMouseEnter={() => !disabled && setHover(i)} onMouseLeave={() => setHover(0)}
          onClick={() => !disabled && onChange(i)}
          className={cn('transition-all duration-200', disabled ? 'cursor-default' : 'cursor-pointer hover:scale-125 active:scale-95')}>
          <Star className={cn('w-8 h-8 transition-all duration-300',
            i <= (hover || value)
              ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]'
              : 'text-gray-200 hover:text-gray-300')} />
        </button>
      ))}
    </div>
  )
}

export default function RatingsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const router = useRouter()
  const sp = useSearchParams()
  const ratedUserId = sp.get('ratedUserId') || ''
  const [scores, setScores] = useState({ responseScore: 0, accuracyScore: 0, behaviourScore: 0 })
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [existingRating, setExistingRating] = useState<Rating | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Check if user already rated this order
  useEffect(() => {
    ratingsApi.check(orderId)
      .then(r => {
        if (r.data.data?.hasRated) {
          setExistingRating(r.data.data.rating)
          setScores({
            responseScore: r.data.data.rating.responseScore,
            accuracyScore: r.data.data.rating.accuracyScore,
            behaviourScore: r.data.data.rating.behaviourScore,
          })
          if (r.data.data.rating.comment) setComment(r.data.data.rating.comment)
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [orderId])

  const allScored = Object.values(scores).every(v => v > 0)
  const avg = allScored ? (Object.values(scores).reduce((a, b) => a + b, 0) / 3) : 0
  const isLocked = !!existingRating || submitted

  const handleSubmit = async () => {
    if (isLocked) return
    if (!allScored) { toast.error('Please rate all 3 criteria'); return }
    if (!ratedUserId) { toast.error('Invalid rating target'); return }
    setLoading(true)
    try {
      await ratingsApi.submit(orderId, { ratedUserId, ...scores, comment: comment || undefined })
      setSubmitted(true)
      toast.success('Rating submitted! Thank you 🙏')
    } catch (e) {
      const msg = getErrorMessage(e)
      if (msg.includes('already rated')) {
        setSubmitted(true)
        toast.error('You have already rated this order')
      } else {
        toast.error(msg)
      }
    }
    finally { setLoading(false) }
  }

  if (checking) {
    return (
      <div className="page-container max-w-md mx-auto flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
        <p className="text-sm text-gray-400 font-medium">Loading...</p>
      </div>
    )
  }

  // Already rated — show read-only summary
  if (isLocked) {
    return (
      <div className="page-container max-w-md mx-auto space-y-5 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto animate-bounce-in">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-navy">
            {submitted ? 'Rating Submitted!' : 'Already Rated'}
          </h1>
          <p className="text-sm text-gray-500">
            {submitted
              ? 'Thank you for your feedback! It helps our community grow stronger.'
              : 'You have already submitted your rating for this order.'}
          </p>
        </div>

        <div className="text-center py-3 animate-scale-in">
          <div className="text-5xl font-extrabold text-brand">{avg.toFixed(1)}</div>
          <div className="flex justify-center gap-1 mt-2">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className={cn('w-6 h-6 transition-all', i <= Math.round(avg) ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-1">Overall Rating</p>
        </div>

        <div className="space-y-2">
          {CRITERIA.map((c, i) => (
            <Card key={c.key} className="animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{c.emoji}</span>
                    <p className="font-bold text-navy text-sm">{c.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRating value={scores[c.key as keyof typeof scores]} onChange={() => {}} disabled />
                    <span className="text-sm font-extrabold text-brand w-8 text-right">
                      {scores[c.key as keyof typeof scores]}/5
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {comment && (
          <Card className="animate-slide-up" style={{ animationDelay: '300ms' }}>
            <CardContent className="py-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Your Comment</p>
              <p className="text-sm text-gray-700">{comment}</p>
            </CardContent>
          </Card>
        )}

        <Link href={`/orders/${orderId}`}>
          <Button className="w-full" variant="secondary" size="lg">
            <ArrowLeft className="w-4 h-4" /> Back to Order
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="page-container max-w-md mx-auto space-y-5 animate-fade-in">
      <div className="text-center space-y-1">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-float">
          <Star className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-navy">Rate Your Experience</h1>
        <p className="text-sm text-gray-500">Help the community by sharing your honest feedback</p>
      </div>

      {allScored && (
        <div className="text-center py-4 animate-scale-in">
          <div className="text-5xl font-extrabold text-brand transition-all duration-500">{avg.toFixed(1)}</div>
          <div className="flex justify-center gap-1 mt-2">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className={cn('w-5 h-5 transition-all duration-300', i <= Math.round(avg) ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-1">Overall average</p>
        </div>
      )}

      <div className="space-y-3">
        {CRITERIA.map((c, i) => (
          <Card key={c.key} className="card-hover animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{c.emoji}</span>
                  <div>
                    <p className="font-bold text-navy text-sm">{c.label}</p>
                    <p className="text-xs text-gray-500">{c.desc}</p>
                  </div>
                </div>
                {scores[c.key as keyof typeof scores] > 0 && (
                  <span className="text-lg font-extrabold text-brand animate-scale-in">
                    {scores[c.key as keyof typeof scores]}/5
                  </span>
                )}
              </div>
              <StarRating value={scores[c.key as keyof typeof scores]}
                onChange={v => setScores(p => ({ ...p, [c.key]: v }))} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="animate-slide-up" style={{ animationDelay: '300ms' }}>
        <CardContent className="py-4">
          <p className="font-bold text-navy text-sm mb-2">Comment (optional)</p>
          <textarea className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none resize-none transition-colors"
            rows={3} placeholder="Share your experience..." maxLength={500}
            value={comment} onChange={e => setComment(e.target.value)} />
          <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/500</p>
        </CardContent>
      </Card>

      <Button className="w-full animate-slide-up" style={{ animationDelay: '400ms' }} size="lg"
        onClick={handleSubmit} loading={loading} disabled={!allScored}>
        <Star className="w-4 h-4" /> Submit Rating
      </Button>
    </div>
  )
}
