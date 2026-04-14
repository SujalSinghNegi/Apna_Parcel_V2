'use client'
import { useState } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { fmt } from '@/lib/utils'
import { CreditCard, ShieldCheck } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      fontFamily: 'inherit',
      color: '#1E3A5F',
      '::placeholder': { color: '#9CA3AF' },
      iconColor: '#FF6B35',
    },
    invalid: {
      color: '#EF4444',
      iconColor: '#EF4444',
    },
  },
  hidePostalCode: true,
}

function CheckoutForm({
  clientSecret,
  amount,
  onSuccess,
  onClose,
}: {
  clientSecret: string
  amount: number
  onSuccess: () => void
  onClose: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return

    setLoading(true)
    setError('')

    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      { payment_method: { card: cardElement } }
    )

    if (confirmError) {
      setError(confirmError.message || 'Payment failed. Please try again.')
      setLoading(false)
      return
    }

    if (paymentIntent?.status === 'requires_capture' || paymentIntent?.status === 'succeeded') {
      onSuccess()
    } else {
      setError('Unexpected payment state. Please contact support.')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-gradient-to-br from-gray-50 to-stone-50 rounded-2xl p-5 text-center">
        <p className="text-sm text-gray-500 font-medium">Amount to pay</p>
        <p className="text-3xl font-extrabold text-navy mt-1">{fmt.currency(amount)}</p>
        <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Funds held securely until delivery</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-navy-700 mb-2">Card Details</label>
        <div className="border-2 border-gray-200 rounded-xl px-4 py-3.5 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10 transition-all">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 font-medium">
          {error}
        </div>
      )}

      <div className="bg-blue-50 rounded-xl px-4 py-3">
        <p className="text-xs text-blue-700 font-medium">
          💡 Test mode: use card <span className="font-mono font-bold">4242 4242 4242 4242</span>, any future expiry, and any CVC.
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 shadow-lg shadow-brand/20"
          loading={loading}
          disabled={!stripe}
        >
          <CreditCard className="w-4 h-4" /> Pay {fmt.currency(amount)}
        </Button>
      </div>
    </form>
  )
}

export function StripePaymentModal({
  open,
  onClose,
  clientSecret,
  amount,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  clientSecret: string
  amount: number
  onSuccess: () => void
}) {
  if (!clientSecret) return null

  return (
    <Modal open={open} onClose={onClose} title="Secure Payment">
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm
          clientSecret={clientSecret}
          amount={amount}
          onSuccess={onSuccess}
          onClose={onClose}
        />
      </Elements>
    </Modal>
  )
}
